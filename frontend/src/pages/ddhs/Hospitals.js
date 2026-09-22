import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { hospitalService } from '../../services/api';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const theme = {
  primary: '#008000',
  primaryLight: '#e8f5e9',
  secondary: '#1e293b',
  textMain: '#0f172a',
  textMuted: '#475569',
  textLight: '#94a3b8',
  border: 'rgba(226, 232, 240, 0.8)',
  shadow: '0 4px 20px rgba(0,0,0,0.06)',
  shadowLg: '0 20px 50px rgba(0,0,0,0.1)',
};

const Hospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hospitalDetails, setHospitalDetails] = useState(null);
  const [filter, setFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [trendRange, setTrendRange] = useState('1W');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHospital, setNewHospital] = useState({
    name: '',
    hospital_id: '',
    type: 'PHC',
    address: '',
    contact: '',
    email: '',
    lat: '',
    lng: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get('id');
    if (id && hospitals.length > 0) {
      const hospital = hospitals.find(h => h.hospital_id === id);
      if (hospital && (!selectedHospital || selectedHospital.hospital_id !== id)) {
        fetchDetails(hospital);
      }
    }
  }, [location.search, hospitals]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchHospitals(); }, [filter]);

  useEffect(() => {
    if (selectedHospital) {
      fetchDetails(selectedHospital, trendRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendRange]);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const res = await hospitalService.getAll(filter);
      setHospitals(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (hospital, range = trendRange) => {
    setSelectedHospital(hospital);
    setDetailsLoading(true);
    try {
      const res = await hospitalService.getDetails(hospital.hospital_id, range);
      setHospitalDetails(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSendAlert = async () => {
    if (!alertMsg) return;
    try {
      await hospitalService.sendAlert({
        hospital_id: selectedHospital.hospital_id,
        message: alertMsg,
        subject: `Priority Alert: ${selectedHospital.name}`
      });
      setAlertMsg('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...newHospital,
        location: {
          lat: parseFloat(newHospital.lat) || 0,
          lng: parseFloat(newHospital.lng) || 0
        }
      };

      if (isEditing) {
        await hospitalService.update(editingId, payload);
        alert('Hospital updated successfully!');
      } else {
        await hospitalService.create(payload);
        alert('Hospital added successfully!');
      }

      setShowAddModal(false);
      setIsEditing(false);
      setEditingId(null);
      setNewHospital({ name: '', hospital_id: '', type: 'PHC', address: '', contact: '', email: '', lat: '', lng: '' });
      fetchHospitals();
    } catch (err) {
      alert(err.message || 'Error processing request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (hospital) => {
    setNewHospital({
      name: hospital.name,
      hospital_id: hospital.hospital_id,
      type: hospital.type,
      address: hospital.address,
      contact: hospital.contact,
      email: hospital.email || '',
      lat: hospital.location?.lat || '',
      lng: hospital.location?.lng || ''
    });
    setEditingId(hospital._id);
    setIsEditing(true);
    setShowAddModal(true);
  };

  const filteredHospitals = hospitals.filter(h =>
    h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.hospital_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.contact?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const typeColor = (type) => {
    if (type === 'PHC') return { bg: '#dcfce7', color: '#15803d' };
    if (type === 'UPHC') return { bg: '#dbeafe', color: '#1d4ed8' };
    if (type === 'Sub-Centre' || type === 'SUB_CENTRE') return { bg: '#fff7ed', color: '#c2410c' };
    return { bg: '#fef3c7', color: '#d97706' };
  };

  return (
    <div style={{ padding: '30px 40px', fontFamily: "'Inter', sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: theme.textMain, fontFamily: "'Outfit', sans-serif", margin: 0, letterSpacing: '-1px' }}>
          Health Centre Registry
        </h1>
        <p style={{ margin: '6px 0 0', color: theme.textMuted, fontWeight: 500 }}>
          All Primary Health Centres under your district — click any row to view full details.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span className="material-symbols-rounded" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: theme.textLight, fontSize: '1.2rem' }}>search</span>
          <input
            type="text"
            placeholder="Search by name, ID, or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '15px', border: `1px solid ${theme.border}`, outline: 'none', background: 'white', fontSize: '0.9rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '12px 20px', borderRadius: '15px', border: `1px solid ${theme.border}`, background: 'white', color: theme.textMain, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
        >
          <option value="">All Types</option>
          <option value="PHC">PHC</option>
          <option value="UPHC">UPHC</option>
          <option value="Sub-Centre">Sub-Centre</option>
        </select>
        <div style={{ padding: '12px 25px', background: theme.primaryLight, color: theme.primary, borderRadius: '15px', fontWeight: 700, fontSize: '0.9rem' }}>
          {filteredHospitals.length} Health Centres
        </div>
        <button
          onClick={() => {
            setIsEditing(false);
            setNewHospital({ name: '', hospital_id: '', type: 'PHC', address: '', contact: '', email: '', lat: '', lng: '' });
            setShowAddModal(true);
          }}
          style={{
            padding: '12px 25px',
            background: theme.primary,
            color: 'white',
            borderRadius: '15px',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0, 128, 0, 0.2)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>add_circle</span>
          Add New Health Centre
        </button>
      </div>

      {/* Hospital Table */}
      <div style={{ background: 'white', borderRadius: '24px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${theme.border}` }}>
              {['ID', 'Name & Address', 'Type', 'Contact', 'Action'].map(head => (
                <th key={head} style={{ padding: '15px 25px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: theme.textLight, textTransform: 'uppercase', letterSpacing: '1px' }}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '100px', textAlign: 'center', color: theme.textMuted, fontWeight: 600 }}>Syncing facility records...</td></tr>
            ) : filteredHospitals.map(h => (
              <tr key={h.hospital_id}
                onClick={() => fetchDetails(h)}
                style={{ borderBottom: `1px solid ${theme.border}`, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fcfcfd'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '20px 25px', fontWeight: 800, color: theme.textMain, fontSize: '0.85rem' }}>{h.hospital_id}</td>
                <td style={{ padding: '20px 25px' }}>
                  <div style={{ fontWeight: 700, color: theme.textMain, fontSize: '0.95rem' }}>{h.name}</div>
                  <div style={{ fontSize: '0.8rem', color: theme.textMuted, marginTop: '2px' }}>{h.address}</div>
                </td>
                <td style={{ padding: '20px 25px' }}>
                  <span style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, ...typeColor(h.type) }}>{h.type}</span>
                </td>
                <td style={{ padding: '20px 25px' }}>
                  <div style={{ fontWeight: 700, color: theme.textMain, fontSize: '0.9rem' }}>{h.contact || '—'}</div>
                  <div style={{ fontSize: '0.75rem', color: theme.textMuted, marginTop: '2px' }}>{h.email || 'No email provided'}</div>
                </td>
                <td style={{ padding: '20px 25px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); fetchDetails(h); }}
                      style={{ padding: '8px 12px', background: theme.primaryLight, color: theme.primary, border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>visibility</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditClick(h); }}
                      style={{ padding: '8px 12px', background: '#fef3c7', color: '#d97706', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hospital Detail Modal */}
      {selectedHospital && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
          onClick={() => { setSelectedHospital(null); setHospitalDetails(null); setTrendRange('1W'); navigate('/hospitals', { replace: true }); }}>
          <div style={{
            width: '1100px', maxWidth: '98vw', maxHeight: '92vh', background: '#fcfcfd',
            borderRadius: '32px', boxShadow: '0 30px 80px rgba(0,0,0,0.3)', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', position: 'relative',
            animation: 'modalScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
            onClick={e => e.stopPropagation()}>

            <style>{`
              @keyframes modalScale {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>

            {/* Modal Header */}
            <div style={{ padding: '30px 50px', background: 'white', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ padding: '5px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, ...typeColor(selectedHospital.type) }}>{selectedHospital.type}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.textLight }}>ID: {selectedHospital.hospital_id}</span>
                </div>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: theme.textMain, margin: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '-1px' }}>{selectedHospital.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                  <span style={{ color: theme.textMuted, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>location_on</span>{selectedHospital.address}</span>
                  <span style={{ color: theme.textMuted, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}><span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>map</span>{selectedHospital.district} District</span>
                </div>
              </div>
              <button onClick={() => { setSelectedHospital(null); setHospitalDetails(null); setTrendRange('1W'); navigate('/hospitals', { replace: true }); }} style={{ width: '45px', height: '45px', borderRadius: '50%', border: 'none', background: '#f1f5f9', color: theme.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.background = '#e2e8f0'} onMouseLeave={e => e.target.style.background = '#f1f5f9'}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div style={{ padding: '35px 50px', display: 'flex', flexDirection: 'column', gap: '30px' }}>

              {/* Facility Intelligence Section */}
              <section>
                <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.textLight, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>analytics</span>
                  Facility Intelligence
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                  {[
                    { icon: 'call', label: 'Primary Contact', value: selectedHospital.contact || '—', color: '#3b82f6' },
                    { icon: 'groups', label: 'Total Workforce', value: hospitalDetails ? `${hospitalDetails.staff?.length ?? 0} Personnel` : `${selectedHospital.staff_count || 0} Personnel`, color: theme.primary },
                    { icon: 'medical_information', label: "Patient Flow (Today)", value: hospitalDetails ? `${hospitalDetails.opd_count_today ?? 0} OPD Visits` : '—', color: '#8b5cf6' },
                    { icon: 'inventory_2', label: 'Supply Status', value: hospitalDetails ? `${hospitalDetails.stocks?.filter(s => (s.type === 'medicine' || !s.type) && s.status !== 'normal').length ?? 0} Low Stock Medicines` : '—', color: '#f59e0b' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'white', borderRadius: '18px', padding: '20px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '1.1rem', color: item.color }}>{item.icon}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: theme.textLight, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
                      </div>
                      <div style={{ fontWeight: 800, color: theme.textMain, fontSize: '1.05rem', paddingLeft: '2px' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              {detailsLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: theme.textMuted }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: theme.primary, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
                  <span style={{ fontWeight: 600 }}>Analyzing facility data...</span>
                </div>
              ) : hospitalDetails && (
                <>
                  {/* Critical Supply Shortages */}
                  {hospitalDetails.stocks?.filter(s => (s.type === 'medicine' || !s.type) && s.status !== 'normal').length > 0 && (
                    <section>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                          <span className="material-symbols-rounded">inventory_2</span>
                          Critical Medicine Shortages
                        </h3>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#e11d48', background: '#fff1f2', padding: '4px 12px', borderRadius: '10px', border: '1px solid #fecaca' }}>ACTION REQUIRED</span>
                      </div>
                      <div style={{ background: 'white', borderRadius: '24px', border: `1px solid ${theme.border}`, padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                          {hospitalDetails.stocks?.filter(s => (s.type === 'medicine' || !s.type) && s.status !== 'normal').map(s => (
                            <div key={s.medicine_name} style={{ background: '#f8fafc', padding: '12px 15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.textMain }}>{s.medicine_name}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                                <span style={{ fontSize: '0.7rem', color: theme.textMuted, fontWeight: 600 }}>Stock: {s.closing_stock} {s.unit || 'units'}</span>
                                <span style={{ fontSize: '0.7rem', color: '#e11d48', fontWeight: 700 }}>{s.status.replace('_', ' ').toUpperCase()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* OPD Performance Trend Section */}
                  <section>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.textLight, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <span className="material-symbols-rounded">trending_up</span>
                        OPD Performance Trend
                      </h3>
                      <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '2px' }}>
                        {['1W', '1M', '3M', '1Y'].map(t => (
                          <button
                            key={t}
                            onClick={() => setTrendRange(t)}
                            style={{
                              padding: '6px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                              background: trendRange === t ? 'white' : 'transparent',
                              color: trendRange === t ? theme.primary : theme.textLight,
                              fontWeight: 700, fontSize: '0.7rem', transition: 'all 0.2s',
                              boxShadow: trendRange === t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}
                          >{t}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                      <div style={{ height: '240px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={hospitalDetails.opd_history}>
                            <defs>
                              <linearGradient id="opdGradHosp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={theme.primary} stopOpacity={0.15} />
                                <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: theme.textLight, fontSize: 10, fontWeight: 700 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: theme.textLight, fontSize: 10, fontWeight: 700 }} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', padding: '15px' }} />
                            <Area type="monotone" dataKey="count" stroke={theme.primary} strokeWidth={3} fillOpacity={1} fill="url(#opdGradHosp)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </section>

                  {/* Anomaly Alert */}
                  {hospitalDetails.anomaly?.detected && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '18px', padding: '20px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>warning</span>
                      </div>
                      <p style={{ margin: 0, color: '#b91c1c', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4 }}>{hospitalDetails.anomaly.message}</p>
                    </div>
                  )}

                  {/* Staff Table */}
                  <section>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.textLight, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>badge</span>
                      Medical Workforce (Today's Attendance)
                    </h3>
                    <div style={{ background: 'white', borderRadius: '24px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${theme.border}` }}>
                            {['Staff ID', 'Name & Role', 'Shift', 'Check-In', 'Check-Out', 'Status'].map(h => (
                              <th key={h} style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: theme.textLight, textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {hospitalDetails.staff.map(s => (
                            <tr key={s.staff_id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                              <td style={{ padding: '15px 20px', fontSize: '0.8rem', color: theme.textLight, fontWeight: 700 }}>{s.staff_id}</td>
                              <td style={{ padding: '15px 20px' }}>
                                <div style={{ fontWeight: 700, color: theme.textMain, fontSize: '0.9rem' }}>{s.name}</div>
                                <div style={{ fontSize: '0.75rem', color: theme.textMuted }}>{s.role}</div>
                              </td>
                              <td style={{ padding: '15px 20px', fontSize: '0.8rem', color: theme.textMain, fontWeight: 600 }}>{s.shift_type} ({s.shift_start}-{s.shift_end})</td>
                              <td style={{ padding: '15px 20px', fontSize: '0.85rem', fontWeight: 700, color: theme.textMain }}>{s.check_in_time || '—'}</td>
                              <td style={{ padding: '15px 20px', fontSize: '0.85rem', fontWeight: 700, color: theme.textMain }}>{s.check_out_time || '—'}</td>
                              <td style={{ padding: '15px 20px' }}>
                                <span style={{
                                  padding: '5px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                                  background: s.status === 'present' ? '#f0fdf4' : (s.status === 'late' ? '#fffbeb' : '#fef2f2'),
                                  color: s.status === 'present' ? '#166534' : (s.status === 'late' ? '#854d0e' : '#991b1b'),
                                  border: `1px solid ${s.status === 'present' ? '#bbf7d0' : (s.status === 'late' ? '#fef08a' : '#fecaca')}`
                                }}>{s.status.toUpperCase()}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Recent Patient Visits */}
                  <section>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: theme.textLight, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>personal_injury</span>
                      Recent Patients & Consultations
                    </h3>
                    <div style={{ background: 'white', borderRadius: '24px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${theme.border}` }}>
                            {['Patient Name', 'Age/Gen', 'Diagnosis', 'Medicines', 'Doctor Handled', 'Visit Date'].map(h => (
                              <th key={h} style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: theme.textLight, textTransform: 'uppercase' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {hospitalDetails.patients?.map((p, idx) => (
                            <tr key={idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                              <td style={{ padding: '20px 25px', fontWeight: 700, color: theme.textMain, fontSize: '0.9rem' }}>{p.name}</td>
                              <td style={{ padding: '20px 25px', fontSize: '0.8rem', color: theme.textMuted }}>{p.age} yrs / {p.gender?.[0]}</td>
                              <td style={{ padding: '20px 25px', fontSize: '0.8rem', color: theme.textMuted }}>{p.diagnosis || '—'}</td>
                              <td style={{ padding: '20px 25px', fontSize: '0.85rem', color: theme.textMain, fontWeight: 700 }}>{p.medicines || '—'}</td>
                              <td style={{ padding: '20px 25px', fontSize: '0.8rem', color: theme.textMuted }}>{p.doctor_handled || '—'}</td>
                              <td style={{ padding: '20px 25px', fontSize: '0.85rem', color: theme.textMain, fontWeight: 700 }}>{p.visit_date}</td>
                            </tr>
                          ))}
                          {(!hospitalDetails.patients || hospitalDetails.patients.length === 0) && (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: theme.textLight }}>No recent patient visits recorded.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Manual Alert Control */}
                  <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '24px', border: `1px solid ${theme.border}` }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.textMain, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-rounded" style={{ color: theme.primary }}>send</span>
                      Dispatch High-Priority Alert
                    </h3>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <input
                        type="text"
                        placeholder="Type high-priority message to hospital administrator..."
                        value={alertMsg}
                        onChange={(e) => setAlertMsg(e.target.value)}
                        style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', border: `1px solid ${theme.border}`, outline: 'none', fontSize: '0.9rem' }}
                      />
                      <button
                        onClick={handleSendAlert}
                        disabled={!alertMsg}
                        style={{ padding: '0 30px', background: theme.primary, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: alertMsg ? 'pointer' : 'not-allowed', opacity: alertMsg ? 1 : 0.6 }}
                      >Send Alert</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Add New Hospital Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
          onClick={() => setShowAddModal(false)}>
          <div style={{
            width: '600px', maxWidth: '95vw', background: 'white',
            borderRadius: '24px', boxShadow: theme.shadowLg, overflow: 'hidden',
            display: 'flex', flexDirection: 'column', animation: 'modalScale 0.3s ease'
          }} onClick={e => e.stopPropagation()}>

            <div style={{ padding: '24px 35px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: theme.textMain, fontFamily: "'Outfit', sans-serif" }}>
                {isEditing ? 'Update Health Centre' : 'Register New Health Centre'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'white', border: `1px solid ${theme.border}`, borderRadius: '12px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-rounded" style={{ color: theme.textMuted }}>close</span>
              </button>
            </div>

            <form onSubmit={handleCreateHospital} style={{ padding: '35px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.textLight, textTransform: 'uppercase' }}>Centre Name</label>
                  <input required type="text" value={newHospital.name} onChange={e => setNewHospital({ ...newHospital, name: e.target.value })} placeholder="e.g. Madurai Central PHC" style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.textLight, textTransform: 'uppercase' }}>Centre ID (Unique)</label>
                  <input required disabled={isEditing} type="text" value={newHospital.hospital_id} onChange={e => setNewHospital({ ...newHospital, hospital_id: e.target.value })} placeholder="e.g. PHC001" style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, outline: 'none', background: isEditing ? '#f1f5f9' : 'white' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.textLight, textTransform: 'uppercase' }}>Facility Type</label>
                  <select value={newHospital.type} onChange={e => setNewHospital({ ...newHospital, type: e.target.value })} style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, outline: 'none', background: 'white' }}>
                    <option value="PHC">PHC</option>
                    <option value="UPHC">UPHC</option>
                    <option value="Sub-Centre">Sub-Centre</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.textLight, textTransform: 'uppercase' }}>Contact Number</label>
                  <input required type="text" value={newHospital.contact} onChange={e => setNewHospital({ ...newHospital, contact: e.target.value })} placeholder="e.g. 0452-2XXXXX" style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.textLight, textTransform: 'uppercase' }}>Email ID</label>
                <input required type="email" value={newHospital.email} onChange={e => setNewHospital({ ...newHospital, email: e.target.value })} placeholder="e.g. contact@phc.gov.in" style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.textLight, textTransform: 'uppercase' }}>Full Address</label>
                <textarea required value={newHospital.address} onChange={e => setNewHospital({ ...newHospital, address: e.target.value })} placeholder="Complete postal address..." style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, outline: 'none', minHeight: '80px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.textLight, textTransform: 'uppercase' }}>Latitude</label>
                  <input type="number" step="any" value={newHospital.lat} onChange={e => setNewHospital({ ...newHospital, lat: e.target.value })} placeholder="9.92XX" style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.textLight, textTransform: 'uppercase' }}>Longitude</label>
                  <input type="number" step="any" value={newHospital.lng} onChange={e => setNewHospital({ ...newHospital, lng: e.target.value })} placeholder="78.12XX" style={{ padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.border}`, outline: 'none' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: theme.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: '0 10px 20px rgba(0, 128, 0, 0.15)',
                  transition: 'all 0.2s'
                }}
              >
                {isSubmitting ? 'Processing...' : (isEditing ? 'Update Facility Details' : 'Confirm Registration')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hospitals;
