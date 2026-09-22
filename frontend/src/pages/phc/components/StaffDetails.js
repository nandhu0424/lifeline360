import React, { useState, useEffect } from 'react';
import { staffService, attendanceService } from '../../../services/api';

const StaffDetails = ({ theme }) => {
  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingAttendance, setViewingAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    staff_id: '', name: '', role: 'Doctor', mobile: '', email: '', essential_details: ''
  });
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [tempSchedule, setTempSchedule] = useState(null);
  const [editingDay, setEditingDay] = useState(null); // Track which day is being edited in modal

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const [staffRes, attRes] = await Promise.all([
        staffService.getAll(),
        attendanceService.getToday()
      ]);

      if (staffRes.data) {
        const allStaff = [...(staffRes.data.medical || []), ...(staffRes.data.cleaning || [])];
        setStaffList(allStaff);
        setFilteredStaff(allStaff);
      }

      if (attRes.data && attRes.data.records) {
        const attMap = {};
        attRes.data.records.forEach(r => {
          attMap[r.staff_id] = r;
        });
        setTodayAttendance(attMap);
      }
    } catch (err) {
      console.error('Error fetching staff data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  // Handle Filtering
  useEffect(() => {
    let result = staffList;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.mobile.includes(term) ||
        s.staff_id.toLowerCase().includes(term)
      );
    }

    if (roleFilter !== 'All') {
      result = result.filter(s => s.role === roleFilter);
    }

    if (statusFilter !== 'All') {
      result = result.filter(s => {
        const isPresent = todayAttendance[s.staff_id] && todayAttendance[s.staff_id].status === 'present';
        return statusFilter === 'Present' ? isPresent : !isPresent;
      });
    }

    setFilteredStaff(result);
  }, [searchTerm, roleFilter, statusFilter, staffList, todayAttendance]);
    const handleManualCheckIn = async (staffId) => {
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await attendanceService.checkIn({
        staff_id: staffId,
        time: timeStr,
        biometric_verified: false
      });
      alert('Manually checked in successfully.');
      fetchStaffData();
    } catch (err) {
      alert(err.message || 'Check-in failed');
    }
  };
  const handleManualCheckOut = async (staffId) => {
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      await attendanceService.checkOut({
        staff_id: staffId,
        time: timeStr,
        biometric_verified: false
      });
      alert('Manually checked out successfully.');
      fetchStaffData();
    } catch (err) {
      alert(err.message || 'Check-out failed');
    }
  };

  const handleEditClick = (staff) => {
    setEditingStaff({ ...staff, role: staff.is_chief && staff.role === 'Doctor' ? 'Doctor(Chief)' : staff.role });
  };

  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    setSaveLoading(true);
    try {
      const payload = { ...editingStaff };
      if (payload.role === 'Doctor(Chief)') {
        payload.role = 'Doctor';
        payload.is_chief = true;
      } else {
        payload.is_chief = false;
      }
      await staffService.update(editingStaff._id, payload);
      setEditingStaff(null);
      fetchStaffData(); // Refresh list
    } catch (err) {
      alert('Error updating staff details: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.mobile) {
      alert('Please fill in Name and Mobile number.');
      return;
    }
    setSaveLoading(true);
    try {
      const payload = { ...newStaff };
      if (payload.role === 'Doctor(Chief)') {
        payload.role = 'Doctor';
        payload.is_chief = true;
      } else {
        payload.is_chief = false;
      }
      await staffService.add(payload);
      setShowAddModal(false);
      setNewStaff({ staff_id: '', name: '', role: 'Doctor', mobile: '', email: '', essential_details: '' });
      fetchStaffData();
    } catch (err) {
      alert('Error adding staff: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (window.confirm(`Are you sure you want to remove ${staff.name} from the records?`)) {
      try {
        await staffService.delete(staff._id);
        fetchStaffData();
      } catch (err) {
        alert('Error deleting staff: ' + err.message);
      }
    }
  };

  const handleViewAttendance = async (staff) => {
    setViewingAttendance(staff);
    setAttLoading(true);
    try {
      const res = await attendanceService.getStaffHistory(staff.staff_id);
      const rawHistory = res.data || [];

      // Generate dates for the last 30 days up to today
      const historyList = [];
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateKey = `${yyyy}-${mm}-${dd}`;

        const existingRecord = rawHistory.find(r => r.date === dateKey);

        if (existingRecord) {
          // User requirement: if both in and out are missing, consider absent
          const isActuallyAbsent = !existingRecord.check_in_time && !existingRecord.check_out_time;
          historyList.push({
            ...existingRecord,
            status: isActuallyAbsent ? 'absent' : existingRecord.status
          });
        } else {
          // No record found for this day, mark as absent
          historyList.push({
            date: dateKey,
            check_in_time: null,
            check_out_time: null,
            status: 'absent',
            is_auto_generated: true
          });
        }
      }
      setAttendanceHistory(historyList);
    } catch (err) {
      console.error('Error fetching attendance history', err);
    } finally {
      setAttLoading(false);
    }
  };

  const handleOpenSchedule = (staff) => {
    const defaultSchedule = {
      monday: { working: true, start: '09:00', end: '17:00' },
      tuesday: { working: true, start: '09:00', end: '17:00' },
      wednesday: { working: true, start: '09:00', end: '17:00' },
      thursday: { working: true, start: '09:00', end: '17:00' },
      friday: { working: true, start: '09:00', end: '17:00' },
      saturday: { working: true, start: '09:00', end: '13:00' },
      sunday: { working: false, start: '00:00', end: '00:00' }
    };
    setViewingSchedule(staff);
    setTempSchedule(staff.weekly_schedule || defaultSchedule);
    setEditingDay(null);
  };

  const getTodaySchedule = (staff) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    const sched = (staff.weekly_schedule && staff.weekly_schedule[today]) || null;

    if (!sched || !sched.working) return 'Off Duty';
    return `${sched.start} - ${sched.end}`;
  };

  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        fullDayName: d.toLocaleDateString('en-US', { weekday: 'long' })
      });
    }
    return days;
  };

  const getCurrentWeekDates = () => {
    const dates = {};
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

    const monday = new Date(now.setDate(diffToMonday));
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    dayNames.forEach((day, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      dates[day] = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    });

    return dates;
  };

  const handleSaveSchedule = async () => {
    if (!viewingSchedule) return;
    setSaveLoading(true);
    try {
      await staffService.update(viewingSchedule._id, { weekly_schedule: tempSchedule });
      setViewingSchedule(null);
      fetchStaffData();
    } catch (err) {
      alert('Error saving schedule: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateDay = (day, field, value) => {
    setTempSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '400px', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: theme.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <div style={{
        background: 'white', padding: '30px', borderRadius: '32px',
        border: `1px solid ${theme.border}`, boxShadow: theme.shadow
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: theme.textMain, fontFamily: "'Outfit', sans-serif", margin: 0 }}>Human Resource Directory</h2>
            <p style={{ margin: '5px 0 0 0', color: theme.textMuted, fontSize: '0.95rem', fontWeight: 600 }}>Manage medical and support staff records</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ padding: '10px 20px', background: theme.primaryLight, borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded" style={{ color: theme.primary }}>groups</span>
              <span style={{ fontWeight: 800, color: theme.primary }}>{filteredStaff.length} / {staffList.length} Records</span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '12px 25px', background: theme.primary, color: 'white',
                borderRadius: '15px', border: 'none', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0, 128, 0, 0.2)'
              }}
            >
              <span className="material-symbols-rounded">person_add</span>
              Add New Staff
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div style={{
          display: 'flex', gap: '20px', marginBottom: '30px', background: '#f8fafc',
          padding: '20px', borderRadius: '24px', border: `1px solid ${theme.border}`,
          flexWrap: 'wrap', alignItems: 'center'
        }}>
          <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
            <span className="material-symbols-rounded" style={{
              position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)',
              color: theme.textLight, fontSize: '1.2rem'
            }}>search</span>
            <input
              type="text"
              placeholder="Search by name, ID or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '14px 14px 14px 45px', borderRadius: '14px',
                border: `1px solid ${theme.border}`, background: 'white',
                fontSize: '0.95rem', fontWeight: 600, outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = theme.primary}
              onBlur={(e) => e.target.style.borderColor = theme.border}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: '14px 40px 14px 16px', borderRadius: '14px', border: `1px solid ${theme.border}`,
                  background: 'white', fontSize: '0.9rem', fontWeight: 700, color: theme.textMain,
                  appearance: 'none', cursor: 'pointer', outline: 'none', minWidth: '140px'
                }}
              >
                <option value="All">All Roles</option>
                <option value="Doctor">Doctors</option>
                <option value="Nurse">Nurses</option>
                <option value="LabTech">Lab Technicians</option>
                <option value="Cleaning Worker">Support Staff</option>
              </select>
              <span className="material-symbols-rounded" style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                color: theme.textLight, pointerEvents: 'none'
              }}>keyboard_arrow_down</span>
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '14px 40px 14px 16px', borderRadius: '14px', border: `1px solid ${theme.border}`,
                  background: 'white', fontSize: '0.9rem', fontWeight: 700, color: theme.textMain,
                  appearance: 'none', cursor: 'pointer', outline: 'none', minWidth: '140px'
                }}
              >
                <option value="All">Status</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
              <span className="material-symbols-rounded" style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                color: theme.textLight, pointerEvents: 'none'
              }}>keyboard_arrow_down</span>
            </div>

            <button
              onClick={() => { setSearchTerm(''); setRoleFilter('All'); setStatusFilter('All'); }}
              style={{
                padding: '14px', borderRadius: '14px', border: `1px solid ${theme.border}`,
                background: 'white', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center'
              }}
              title="Clear Filters"
            >
              <span className="material-symbols-rounded">filter_alt_off</span>
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '15px 20px', color: theme.textLight, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Employee Profile</th>
                <th style={{ padding: '15px 20px', color: theme.textLight, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Role & Dept</th>
                <th style={{ padding: '15px 20px', color: theme.textLight, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Contact Information</th>
                <th style={{ padding: '15px 20px', color: theme.textLight, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Today's Status</th>
                <th style={{ padding: '15px 20px', color: theme.textLight, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Schedule</th>
                <th style={{ padding: '15px 20px', color: theme.textLight, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff) => (
                <tr key={staff._id} style={{ background: '#f8fafc', borderRadius: '16px', transition: 'transform 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '15px 20px', borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '45px', height: '45px', borderRadius: '12px', background: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${theme.border}`
                      }}>
                        <span className="material-symbols-rounded" style={{ color: theme.textLight }}>person</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: theme.textMain, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {staff.name}
                          {staff.is_chief && <span style={{ fontSize: '0.65rem', background: '#f59e0b', color: 'white', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.5px' }}>CHIEF</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: theme.textLight, fontWeight: 700 }}>ID: {staff.staff_id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <div style={{ fontWeight: 700, color: theme.primary, fontSize: '0.9rem' }}>{staff.role}</div>
                    <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 600 }}>{staff.essential_details || 'General Dept'}</div>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: theme.textMain }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem', color: theme.textLight }}>call</span>
                      {staff.mobile}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 500, color: theme.textMuted, marginTop: '4px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem', color: theme.textLight }}>mail</span>
                      {staff.email || 'no-email@lifeline360.gov.in'}
                    </div>
                  </td>
                  <td style={{ padding: '15px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {todayAttendance[staff.staff_id] ? (
                      todayAttendance[staff.staff_id].status === 'absent' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          <span style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}>ABSENT (ON LEAVE)</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                          {todayAttendance[staff.staff_id].is_late && (
                            <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' }}>LATE CHECK-IN</span>
                          )}
                          {todayAttendance[staff.staff_id].is_early_checkout && (
                            <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}>EARLY CHECK-OUT</span>
                          )}
                          {!todayAttendance[staff.staff_id].is_late && !todayAttendance[staff.staff_id].is_early_checkout && (
                            <span style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: '#f0fdf4', color: theme.primary, border: '1px solid #dcfce7' }}>PRESENT</span>
                          )}
                          <div style={{ fontSize: '0.6rem', marginTop: '2px', opacity: 0.7 }}>{todayAttendance[staff.staff_id].check_in_time}</div>
                        </div>
                      )
                    ) : (
                      <span style={{
                        display: 'inline-block', padding: '6px 14px', borderRadius: '10px',
                        fontSize: '0.75rem', fontWeight: 800,
                        background: getTodaySchedule(staff) === 'Off Duty' ? '#f1f5f9' : '#fffbeb',
                        color: getTodaySchedule(staff) === 'Off Duty' ? theme.textLight : '#d97706',
                        border: getTodaySchedule(staff) === 'Off Duty' ? 'none' : '1px solid #fef08a'
                      }}>
                        {getTodaySchedule(staff) === 'Off Duty' ? 'OFF DUTY' : 'NOT MARKED'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '15px 20px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <button
                      onClick={() => handleOpenSchedule(staff)}
                      style={{
                        padding: '8px 16px', borderRadius: '10px', border: `1px solid ${theme.primary}`,
                        background: 'white', color: theme.primary, cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 700, margin: '0 auto',
                        transition: 'all 0.2s', whiteSpace: 'nowrap',
                        display: 'inline-block'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = theme.primary; e.currentTarget.style.color = 'white'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = theme.primary; }}
                    >
                      View Schedule
                    </button>
                  </td>
                  <td style={{ padding: '15px 20px', borderTopRightRadius: '16px', borderBottomRightRadius: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>

                      <button
                        onClick={() => handleEditClick(staff)}
                        style={{ padding: '8px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: 'white', cursor: 'pointer', color: theme.primary }}
                        title="Edit Details"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>edit</span>
                      </button>
                      <button
                        onClick={() => handleViewAttendance(staff)}
                        style={{ padding: '8px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: 'white', cursor: 'pointer', color: '#6366f1' }}
                        title="Attendance History"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>event_available</span>
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staff)}
                        style={{ padding: '8px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: 'white', cursor: 'pointer', color: '#ef4444' }}
                        title="Delete Staff"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStaff.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: theme.textLight }}>
              <span className="material-symbols-rounded" style={{ fontSize: '4rem', opacity: 0.2 }}>search_off</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '10px' }}>No staff members found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingStaff && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="animate-slide-up" style={{
            background: 'white', width: '100%', maxWidth: '500px', borderRadius: '28px',
            padding: '35px', boxShadow: theme.shadowLg, border: `1px solid ${theme.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif" }}>Edit Staff Record</h3>
              <button onClick={() => setEditingStaff(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textLight }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>Full Name</label>
                <input
                  type="text"
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>Role</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '0.95rem', fontWeight: 600, outline: 'none', background: 'white' }}
                >
                  <option value="Doctor">Doctor</option>
                  <option value="Doctor(Chief)">Doctor(Chief)</option>
                  <option value="Nurse">Nurse</option>
                  <option value="LabTech">LabTech</option>
                  <option value="Cleaning Worker">Cleaning Worker</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>Mobile Number</label>
                <input
                  type="text"
                  value={editingStaff.mobile}
                  onChange={(e) => setEditingStaff({ ...editingStaff, mobile: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>Email Address</label>
                <input
                  type="email"
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button
                  onClick={() => setEditingStaff(null)}
                  style={{ flex: 1, padding: '14px', borderRadius: '14px', border: `1px solid ${theme.border}`, background: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saveLoading}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                    background: theme.primary, color: 'white', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,128,0,0.2)'
                  }}
                >
                  {saveLoading ? 'Saving...' : 'Update Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="animate-slide-up" style={{
            background: 'white', width: '100%', maxWidth: '500px', borderRadius: '28px',
            padding: '35px', boxShadow: theme.shadowLg, border: `1px solid ${theme.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif" }}>Register New Staff</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textLight }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>Staff ID / Biometric ID</label>
                <input
                  type="text"
                  placeholder="e.g. ST-101 (Leave blank to auto-generate)"
                  value={newStaff.staff_id}
                  onChange={(e) => setNewStaff({ ...newStaff, staff_id: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter staff name"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>Role</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '0.95rem', fontWeight: 600, outline: 'none', background: 'white' }}
                >
                  <option value="Doctor">Doctor</option>
                  <option value="Doctor(Chief)">Doctor(Chief)</option>
                  <option value="Nurse">Nurse</option>
                  <option value="LabTech">LabTech</option>
                  <option value="Cleaning Worker">Cleaning Worker</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>Mobile Number</label>
                <input
                  type="text"
                  placeholder="+91 XXXXX XXXXX"
                  value={newStaff.mobile}
                  onChange={(e) => setNewStaff({ ...newStaff, mobile: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>Department / Details</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology, Morning Shift Helper"
                  value={newStaff.essential_details}
                  onChange={(e) => setNewStaff({ ...newStaff, essential_details: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, fontSize: '0.95rem', fontWeight: 600, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: '14px', border: `1px solid ${theme.border}`, background: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStaff}
                  disabled={saveLoading}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                    background: theme.primary, color: 'white', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,128,0,0.2)'
                  }}
                >
                  {saveLoading ? 'Registering...' : 'Register Staff'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Management Modal */}
      {viewingSchedule && tempSchedule && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="animate-slide-up" style={{
            background: 'white', width: '100%', maxWidth: '600px', borderRadius: '28px',
            padding: '35px', boxShadow: theme.shadowLg, border: `1px solid ${theme.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif" }}>Weekly Duty Roster</h3>
                <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '0.85rem', fontWeight: 600 }}>Configure working hours for {viewingSchedule.name}</p>
              </div>
              <button onClick={() => setViewingSchedule(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textLight }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', background: '#f8fafc', borderRadius: '20px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '15px 20px', background: 'white', borderBottom: `1px solid ${theme.border}`, color: theme.textLight, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                <div style={{ width: '120px' }}>Date & Day</div>
                <div style={{ flex: 1, textAlign: 'center' }}>Timing</div>
                <div style={{ width: '100px', textAlign: 'right' }}>Actions</div>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((dayName) => (
                  <div key={dayName} style={{
                    display: 'flex', alignItems: 'center', padding: '15px 20px',
                    background: tempSchedule[dayName].working ? 'white' : '#f1f5f9',
                    borderBottom: `1px solid ${theme.border}`,
                    opacity: tempSchedule[dayName].working ? 1 : 0.7
                  }}>
                    <div style={{ width: '120px' }}>
                      <div style={{ fontWeight: 800, color: theme.textMain, fontSize: '1rem' }}>{getCurrentWeekDates()[dayName]}</div>
                      <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase' }}>{dayName}</div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {editingDay === dayName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="time"
                            value={tempSchedule[dayName].start}
                            onChange={(e) => handleUpdateDay(dayName, 'start', e.target.value)}
                            style={{ padding: '5px 8px', borderRadius: '8px', border: `1px solid ${theme.primary}`, fontWeight: 700, fontSize: '0.85rem', outline: 'none' }}
                          />
                          <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>-</span>
                          <input
                            type="time"
                            value={tempSchedule[dayName].end}
                            onChange={(e) => handleUpdateDay(dayName, 'end', e.target.value)}
                            style={{ padding: '5px 8px', borderRadius: '8px', border: `1px solid ${theme.primary}`, fontWeight: 700, fontSize: '0.85rem', outline: 'none' }}
                          />
                          <button onClick={() => setEditingDay(null)} style={{ background: theme.primary, color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>done</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontWeight: 700, color: tempSchedule[dayName].working ? theme.textMain : theme.textLight }}>
                          {tempSchedule[dayName].working ? `${tempSchedule[dayName].start} - ${tempSchedule[dayName].end}` : 'Off Duty'}
                        </div>
                      )}
                    </div>

                    <div style={{ width: '100px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button
                        onClick={() => {
                          if (!tempSchedule[dayName].working) {
                            handleUpdateDay(dayName, 'working', true);
                          }
                          setEditingDay(editingDay === dayName ? null : dayName);
                        }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: editingDay === dayName ? theme.primary : theme.textLight,
                        }}
                        title="Edit Timing"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>
                          {editingDay === dayName ? 'check_circle' : 'edit'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          handleUpdateDay(dayName, 'working', false);
                          setEditingDay(null);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: tempSchedule[dayName].working ? 1 : 0.3 }}
                        title="Set Off Duty"
                        disabled={!tempSchedule[dayName].working}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button
                onClick={() => setViewingSchedule(null)}
                style={{ flex: 1, padding: '14px', borderRadius: '14px', border: `1px solid ${theme.border}`, background: 'white', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={saveLoading}
                style={{
                  flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                  background: theme.primary, color: 'white', fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,128,0,0.2)'
                }}
              >
                {saveLoading ? 'Saving...' : 'Apply Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {viewingAttendance && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="animate-slide-up" style={{
            background: 'white', width: '100%', maxWidth: '700px', borderRadius: '28px',
            padding: '35px', boxShadow: theme.shadowLg, border: `1px solid ${theme.border}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif" }}>Attendance History</h3>
                <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: '0.85rem', fontWeight: 600 }}>Staff: {viewingAttendance.name}</p>
              </div>
              <button onClick={() => setViewingAttendance(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textLight }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {attLoading ? (
              <div style={{ display: 'flex', height: '300px', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '30px', height: '30px', border: '3px solid #f1f5f9', borderTopColor: theme.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                {attendanceHistory.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: `1px solid ${theme.border}` }}>
                        <th style={{ padding: '12px 10px', color: theme.textLight, fontSize: '0.75rem', textTransform: 'uppercase' }}>Date</th>
                        <th style={{ padding: '12px 10px', color: theme.textLight, fontSize: '0.75rem', textTransform: 'uppercase' }}>In Time</th>
                        <th style={{ padding: '12px 10px', color: theme.textLight, fontSize: '0.75rem', textTransform: 'uppercase' }}>Out Time</th>
                        <th style={{ padding: '12px 10px', color: theme.textLight, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceHistory.map((rec, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid #f1f5f9` }}>
                          <td style={{ padding: '15px 10px', fontWeight: 700, color: theme.textMain, fontSize: '0.9rem' }}>
                            {new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '15px 10px', fontWeight: 600, color: theme.textMuted, fontSize: '0.85rem' }}>{rec.check_in_time || '--:--'}</td>
                          <td style={{ padding: '15px 10px', fontWeight: 600, color: theme.textMuted, fontSize: '0.85rem' }}>{rec.check_out_time || '--:--'}</td>
                          <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              {rec.status === 'absent' ? (
                                <span style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}>ABSENT</span>
                              ) : (
                                <>
                                  {rec.is_late && (
                                    <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 800, background: '#fff7ed', color: '#ea580c' }}>LATE IN</span>
                                  )}
                                  {rec.is_early_checkout && (
                                    <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 800, background: '#fef2f2', color: '#ef4444' }}>EARLY OUT</span>
                                  )}
                                  {!rec.is_late && !rec.is_early_checkout && (
                                    <span style={{ padding: '4px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, background: '#f0fdf4', color: theme.primary }}>PRESENT</span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: theme.textLight }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '3rem', opacity: 0.2 }}>event_busy</span>
                    <p style={{ fontWeight: 600, marginTop: '10px' }}>No attendance records found.</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setViewingAttendance(null)}
              style={{ width: '100%', marginTop: '25px', padding: '14px', borderRadius: '14px', border: `1px solid ${theme.border}`, background: '#f8fafc', fontWeight: 700, cursor: 'pointer' }}
            >
              Close History
            </button>
          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover {
          transform: translateX(5px);
          background: #f1f5f9 !important;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-slide-up { animation: slideUp 0.5s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default StaffDetails;
