import React, { useState, useEffect } from 'react';
import { attendanceService, hospitalService } from '../../services/api';
import '../../styles/App.css';

const Attendance = () => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [searchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [habitualData, setHabitualData] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'summary', or 'analytics'

  useEffect(() => {
    fetchAttendance();
    fetchHospitals();
    fetchAnalytics();
  }, [selectedDate]);

  const fetchHospitals = async () => {
    try {
      const res = await hospitalService.getAll();
      setHospitals(res.data || []);
    } catch (err) {
      console.error('Failed to fetch hospitals:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await attendanceService.getHabitual();
      setHabitualData(res.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // In a real app, we'd use getToday() for current date and a dynamic endpoint for others
      // For this spec, we'll use the today endpoint as it's the primary dashboard focus
      const res = await attendanceService.getToday();
      setAttendanceData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'var(--success)';
      case 'duty_completed': return '#2563eb';
      case 'late': return 'var(--warning)';
      case 'absent': return 'var(--danger)';
      case 'half_day': return '#fde047';
      default: return 'var(--text-muted)';
    }
  };

  const downloadCSV = () => {
    let csvContent = "\uFEFF"; // Add UTF-8 BOM for Excel

    if (viewMode === 'list') {
      const headers = ["Staff ID", "Hospital", "Name", "Role", "Check-In", "Check-Out", "Status", "Date"];
      csvContent += headers.join(",") + "\n";

      const records = (attendanceData?.records || []).filter(record => {
        const matchesSearch = searchTerm === '' || record.staff_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesHospital = selectedHospital === '' || record.hospital_id === selectedHospital;
        const matchesStatus = statusFilter === '' || record.status === statusFilter;
        return matchesSearch && matchesHospital && matchesStatus;
      });

      records.forEach(r => {
        // Format date to DD-MM-YYYY for better Excel compatibility
        const formattedDate = r.date ? r.date.split('-').reverse().join('-') : '--';

        const statusParts = [];
        if (r.is_late) statusParts.push('LATE CHECK-IN');
        if (r.is_early_checkout) statusParts.push('EARLY CHECK-OUT');
        if (statusParts.length === 0) statusParts.push(r.status.toUpperCase());

        const row = [
          r.staff_id,
          `"${r.hospital_name || r.hospital_id}"`,
          `"${r.staff_name}"`,
          `"${r.staff_role}"`,
          r.check_in_time || '--:--',
          r.check_out_time || '--:--',
          `"${statusParts.join(' & ')}"`,
          `"${formattedDate}"`
        ];
        csvContent += row.join(",") + "\n";
      });
    } else {
      const headers = ["Staff ID", "Name", "Role", "Hospital", "Total Incidents", "Absents", "Lates", "Impact Level"];
      csvContent += headers.join(",") + "\n";

      habitualData.forEach(r => {
        const impact = r.total_incidents > 5 ? 'CRITICAL' : 'CONCERNING';
        const row = [
          r.staff_id,
          `"${r.staff_name}"`,
          `"${r.staff_role}"`,
          `"${r.hospital_name}"`,
          r.total_incidents,
          r.absent_count,
          r.late_count,
          impact
        ];
        csvContent += row.join(",") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = viewMode === 'list' ? `attendance_report_${selectedDate}.csv` : `habitual_absenteeism_report.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in">
      <div className="p-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>

        <div className="grid animate-fade-in" style={{ gridTemplateColumns: '1fr 3fr', gap: '25px' }}>

          {/* Control Panel */}
          <div className="flex flex-col gap-6">
            <div className="glass-panel p-4">
              <h3 style={{ fontSize: '1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--primary)' }}>calendar_month</span>
                Report Controls
              </h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Analysis View</label>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '10px' }}>
                    <button
                      onClick={() => setViewMode('list')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: 700,
                        background: viewMode === 'list' ? 'white' : 'transparent', color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer', transition: 'all 0.2s', boxShadow: viewMode === 'list' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >Live Feed</button>
                    <button
                      onClick={() => setViewMode('analytics')}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: 700,
                        background: viewMode === 'analytics' ? 'white' : 'transparent', color: viewMode === 'analytics' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer', transition: 'all 0.2s', boxShadow: viewMode === 'analytics' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >Trend Analysis</button>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={downloadCSV}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  Download CSV Report
                </button>
              </div>
            </div>

            <div className="glass-panel p-4">
              <h3 style={{ fontSize: '1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--primary)' }}>bar_chart</span>
                Summary Metrics
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Staff</span>
                  <span style={{ fontWeight: 700 }}>{attendanceData?.summary.total || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>Present</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{attendanceData?.summary.present || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>Late</span>
                  <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{attendanceData?.summary.late || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Absent</span>
                  <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{attendanceData?.summary.absent || 0}</span>
                </div>
                <div style={{ marginTop: '10px', height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: `${attendanceData?.summary.percentage || 0}%`,
                    background: 'var(--primary)', borderRadius: '3px'
                  }}></div>
                </div>
                <p style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '5px', color: 'var(--primary)' }}>
                  {attendanceData?.summary.percentage}% Duty Compliance
                </p>
              </div>
            </div>

            <div className="glass-panel p-4" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 10px var(--success)' }}></span>
                Live Biometric Feed
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.5 }}>
                Currently receiving real-time sync from active PHC biometric units.
              </p>
            </div>
          </div>

          {/* Attendance Table or Analytics */}
          <div className="glass-panel p-4">
            {viewMode === 'list' ? (
              <>
                <div className="flex justify-between items-center" style={{ marginBottom: '25px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Detailed Attendance Log</h3>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Hospital Select Filter */}
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedHospital}
                        onChange={(e) => setSelectedHospital(e.target.value)}
                        style={{
                          padding: '10px 40px 10px 16px', borderRadius: '12px', background: 'white',
                          border: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-main)', fontSize: '0.85rem',
                          width: '220px', outline: 'none', cursor: 'pointer', appearance: 'none',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}
                      >
                        <option value="">All Health Centres</option>
                        {hospitals.map(h => (
                          <option key={h.hospital_id} value={h.hospital_id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-rounded" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', pointerEvents: 'none', color: 'var(--text-muted)' }}>local_hospital</span>
                    </div>

                    {/* Status Filter */}
                    <div style={{ position: 'relative' }}>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                          padding: '10px 16px', borderRadius: '12px', background: 'white',
                          border: '1px solid rgba(0,0,0,0.1)', color: 'var(--text-main)', fontSize: '0.85rem',
                          outline: 'none', cursor: 'pointer', appearance: 'none', width: '130px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}
                      >
                        <option value="">All Status</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                      </select>
                      <span className="material-symbols-rounded" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', pointerEvents: 'none', color: 'var(--text-muted)' }}>expand_more</span>
                    </div>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Staff ID</th>
                        <th>Hospital</th>
                        <th>Name / Role</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Syncing with biometric servers...</td></tr>
                      ) : (attendanceData?.records || [])
                        .filter(record => {
                          if (record.status === 'absent' && !record.check_in_time) return false; // hide pure absentees from log
                          const matchesSearch = searchTerm === '' ||
                            record.staff_name.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesHospital = selectedHospital === '' || record.hospital_id === selectedHospital;
                          const matchesStatus = statusFilter === '' || record.status === statusFilter;
                          return matchesSearch && matchesHospital && matchesStatus;
                        })
                        .map(record => (
                          <tr key={record.staff_id}>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{record.staff_id}</td>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>{record.hospital_name || '—'}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{record.hospital_id}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{record.staff_name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{record.staff_role}</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>{record.check_in_time || '--:--'}</span>
                                {record.check_in_time && (
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({record.date})</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>{record.check_out_time || '--:--'}</span>
                                {record.check_out_time && (
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({record.date})</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {record.is_late && (
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5' }}>LATE</span>
                                )}
                                {record.is_early_checkout && (
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}>EARLY OUT</span>
                                )}
                                {!record.is_late && !record.is_early_checkout && (
                                  <span style={{
                                    padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800,
                                    background: `${getStatusColor(record.status)}20`, color: getStatusColor(record.status),
                                    border: `1px solid ${getStatusColor(record.status)}40`
                                  }}>
                                    {record.status.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center" style={{ marginBottom: '25px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Habitual Absenteeism Analytics</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Personnel with 3+ incidents in the last 30 days</p>
                  </div>
                  <div style={{ padding: '8px 16px', background: '#fff1f2', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-rounded" style={{ color: '#e11d48', fontSize: '1.2rem' }}>analytics</span>
                    <span style={{ fontWeight: 800, color: '#e11d48', fontSize: '0.85rem' }}>{habitualData.length} Chronic Cases</span>
                  </div>
                </div>

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Staff Member</th>
                        <th>Hospital</th>
                        <th>Incidents (30d)</th>
                        <th>Breakdown</th>
                        <th>Impact Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {habitualData.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No chronic absenteeism patterns detected.</td></tr>
                      ) : habitualData.map(record => (
                        <tr key={record.staff_id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{record.staff_name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{record.staff_role} (ID: {record.staff_id})</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{record.hospital_name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{record.hospital_id}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e11d48' }}>{record.total_incidents}</div>
                              <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', width: '60px' }}>
                                <div style={{ height: '100%', background: '#e11d48', borderRadius: '3px', width: `${(record.total_incidents / 10) * 100}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem' }}>
                              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{record.absent_count} Absent</span>
                              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{record.late_count} Late</span>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                              background: record.total_incidents > 5 ? '#fff1f2' : '#fefce8',
                              color: record.total_incidents > 5 ? '#e11d48' : '#ca8a04',
                              border: `1px solid ${record.total_incidents > 5 ? '#fecaca' : '#fef08a'}`
                            }}>
                              {record.total_incidents > 5 ? 'CRITICAL' : 'CONCERNING'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Attendance;
