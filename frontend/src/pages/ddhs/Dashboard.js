import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService, hospitalService } from '../../services/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const COLORS = ['#008000', '#005000', '#228B22', '#3cb371'];
const PIE_COLOR_MAP = {
  'PHC': '#008000',        // Green
  'UPHC': '#f59e0b',       // Amber
  'Sub-Centre': '#3b82f6', // Blue
  'SUB_CENTRE': '#3b82f6'  // Blue
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [districtGeoJson, setDistrictGeoJson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [hospitalDetails, setHospitalDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [trendRange, setTrendRange] = useState('1W');

  const mapCenters = {
    'Madurai': [9.9252, 78.1198],
    'Tirunelveli': [8.7139, 77.7567],
    'Chennai': [13.0827, 80.2707],
    'Coimbatore': [11.0168, 76.9558]
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, chartRes, mapRes] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getChart(),
          dashboardService.getMap()
        ]);
        setStats(statsRes.data);
        setChartData(chartRes.data);
        setMapData(mapRes.data);

        // Fetch GeoJSON for border highlighting
        try {
          const geoRes = await axios.get('https://raw.githubusercontent.com/datta07/INDIAN-SHAPEFILES/master/STATES/TAMIL%20NADU/TAMIL%20NADU_DISTRICTS.geojson');
          if (geoRes.data && geoRes.data.features) {
            const district = statsRes.data.district;
            const filtered = geoRes.data.features.find(f =>
              f.properties.dtname.toLowerCase() === district.toLowerCase() ||
              f.properties.dist.toLowerCase() === district.toLowerCase()
            );
            if (filtered) {
              setDistrictGeoJson({
                type: 'FeatureCollection',
                features: [filtered]
              });
            }
          }
        } catch (geoErr) {
          console.error('GeoJSON load failed:', geoErr);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedHospital) {
      fetchHospitalDetails(selectedHospital, trendRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendRange]);

  // Removing silent fetch inside Dashboard since we navigate away
  const fetchHospitalDetails = async (hospital, range = trendRange) => {
    navigate(`/hospitals?id=${hospital.hospital_id}`);
  };
  // End of old fetch details

  const handleStatsClick = (type) => {
    if (type === 'hospitals') {
      navigate('/hospitals');
    } else if (type === 'present' || type === 'absent') {
      navigate('/attendance');
    } else if (type === 'alerts') {
      navigate('/alerts');
    }
  };

  const typeColor = (type) => {
    if (type === 'PHC') return { bg: '#dcfce7', color: '#15803d' };
    if (type === 'UPHC') return { bg: '#dbeafe', color: '#1d4ed8' };
    if (type === 'Sub-Centre') return { bg: '#fff7ed', color: '#c2410c' };
    return { bg: '#fef3c7', color: '#d97706' };
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--primary)' }}>Loading Dashboard...</div>;

  return (
    <div style={{ paddingBottom: '40px', width: '100%' }}>
      <div className="p-4" style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>

        {/* Top Row: Map and Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '30px',
          width: '100%',
          animation: 'slideUp 0.5s ease forwards',
          opacity: 0
        }}>
          {/* Map Column (Left) */}
          <div className="glass-panel" style={{ padding: '20px', height: '100%' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>District Health Map - {stats?.district}</h3>
              <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem' }}>
                <span className="flex items-center gap-2"><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS[0] }}></div> PHC</span>
                <span className="flex items-center gap-2"><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS[1] }}></div> UPHC</span>
                <span className="flex items-center gap-2"><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS[2] }}></div> Sub-Centre</span>
              </div>
            </div>

            <div style={{ height: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
              <MapContainer center={mapCenters[stats?.district] || mapCenters['Madurai']} zoom={10} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {districtGeoJson && (
                  <GeoJSON
                    data={districtGeoJson}
                    style={{
                      color: 'var(--primary)',
                      weight: 3,
                      fillColor: 'var(--primary)',
                      fillOpacity: 0.1
                    }}
                  />
                )}

                {mapData.map(hospital => (
                  <Marker
                    key={hospital.hospital_id}
                    position={[hospital.location.lat, hospital.location.lng]}
                    eventHandlers={{
                      mouseover: (e) => e.target.openPopup(),
                      mouseout: (e) => e.target.closePopup(),
                      click: () => fetchHospitalDetails(hospital),
                    }}
                  >
                    <Popup className="custom-popup" closeButton={false}>
                      <div style={{ color: '#333', padding: '5px' }}>
                        <h4 style={{ margin: '0 0 5px', fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>{hospital.name}</h4>
                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span><strong>Type:</strong> {hospital.type}</span>
                          <span><strong>ID:</strong> {hospital.hospital_id}</span>
                          <span style={{ color: '#666', marginTop: '3px', fontSize: '0.75rem' }}>{hospital.address}</span>
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textAlign: 'center' }}>Click to view full workspace</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Quick Stats Grid (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: 'repeat(4, 1fr)', gap: '15px' }}>

            {/* Card 1 - Total Health Centres */}
            <div
              className="glass-card stat-card-hover"
              style={{ border: '1px solid rgba(0, 128, 0, 0.15)', cursor: 'pointer', padding: '18px 22px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '18px' }}
              onClick={() => handleStatsClick('hospitals')}
            >
              <div style={{
                width: '56px', height: '56px', flexShrink: 0, background: 'rgba(0, 128, 0, 0.1)',
                borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 16px -4px rgba(0, 128, 0, 0.3)'
              }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '1.9rem' }}>local_hospital</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Health Centres</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f172a', lineHeight: 1 }}>{stats?.total_hospitals}</h3>
              </div>
            </div>

            {/* Card 2 - Doctors Present */}
            <div
              className="glass-card stat-card-hover"
              style={{ border: '1px solid rgba(0, 128, 0, 0.15)', cursor: 'pointer', padding: '18px 22px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '18px' }}
              onClick={() => handleStatsClick('present')}
            >
              <div style={{
                width: '56px', height: '56px', flexShrink: 0, background: 'rgba(0, 128, 0, 0.1)',
                borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 16px -4px rgba(0, 128, 0, 0.3)'
              }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '1.9rem' }}>medical_services</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doctors Present</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f172a', lineHeight: 1 }}>{stats?.doctors_present}</h3>
              </div>
            </div>

            {/* Card 3 - Doctors Absent */}
            <div
              className="glass-card stat-card-hover"
              style={{ border: '1px solid rgba(239, 68, 68, 0.15)', cursor: 'pointer', padding: '18px 22px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '18px' }}
              onClick={() => handleStatsClick('absent')}
            >
              <div style={{
                width: '56px', height: '56px', flexShrink: 0, background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 16px -4px rgba(239, 68, 68, 0.3)'
              }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--danger)', fontSize: '1.9rem' }}>warning</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doctors Absent</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--danger)', lineHeight: 1 }}>{stats?.doctors_absent}</h3>
              </div>
            </div>

            {/* Card 4 - Alerts Today */}
            <div
              className="glass-card stat-card-hover"
              style={{ border: '1px solid rgba(245, 158, 11, 0.15)', cursor: 'pointer', padding: '18px 22px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '18px' }}
              onClick={() => handleStatsClick('alerts')}
            >
              <div style={{
                width: '56px', height: '56px', flexShrink: 0, background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 16px -4px rgba(245, 158, 11, 0.3)'
              }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--warning)', fontSize: '1.9rem' }}>notifications</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Alerts Today</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--warning)', lineHeight: 1 }}>{stats?.alerts_today}</h3>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Row: Charts Row */}
        <div className="grid" style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px',
          animation: 'slideUp 0.6s ease forwards', animationDelay: '0.2s', opacity: 0
        }}>
          <div className="glass-panel p-4" style={{ height: '400px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1rem', fontWeight: 600 }}>Centre Distribution</h3>
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={chartData?.hospital_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="type"
                >
                  {chartData?.hospital_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLOR_MAP[entry.type] || '#94a3b8'} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-panel p-4" style={{ height: '400px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1rem', fontWeight: 600 }}>Attendance Trend (7 Days)</h3>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={chartData?.attendance_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }} />
                <Legend />
                <Bar dataKey="present" fill="var(--primary)" name="Present" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" fill="var(--warning)" name="Late" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="var(--danger)" name="Absent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>


        {/* Centered Hospital Detail Workspace */}
        {selectedHospital && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
            onClick={() => { setSelectedHospital(null); setHospitalDetails(null); }}>
            <div style={{
              width: '1100px', maxWidth: '98vw', maxHeight: '92vh', background: '#fcfcfd',
              borderRadius: '32px', boxShadow: '0 30px 80px rgba(0,0,0,0.3)', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', position: 'relative',
              animation: 'modalScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
              onClick={e => e.stopPropagation()}>

              {/* Panel Header - Professional Workspace Header */}
              <div style={{
                padding: '40px 50px 30px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
                position: 'relative'
              }}>
                <button onClick={() => { setSelectedHospital(null); setHospitalDetails(null); }}
                  style={{
                    position: 'absolute', top: '40px', right: '40px',
                    background: 'white', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '15px',
                    width: '44px', height: '44px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'rotate(90deg)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg)'}>
                  <span className="material-symbols-rounded" style={{ color: '#64748b', fontSize: '1.3rem' }}>close</span>
                </button>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '15px' }}>
                  <span style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, ...typeColor(selectedHospital.type), boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>{selectedHospital.type}</span>
                  <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.8px' }}>FACILITY ID: {selectedHospital.hospital_id}</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '2.8rem', fontWeight: 900, color: '#0f172a', fontFamily: "'Outfit', sans-serif", letterSpacing: '-1.5px', lineHeight: 1 }}>{selectedHospital.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', color: '#64748b' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#00800015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '1.2rem', color: '#008000' }}>location_on</span>
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>{selectedHospital.address || 'Address not available'}</span>
                </div>
              </div>

              <div style={{ padding: '40px 50px', display: 'flex', flexDirection: 'column', gap: '40px' }}>

                {/* Facility Intelligence Section */}
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px' }}>Facility Intelligence</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                    {[
                      { icon: 'call', label: 'Primary Contact', value: selectedHospital.contact || '—', color: '#3b82f6' },
                      { icon: 'groups', label: 'Total Workforce', value: hospitalDetails ? `${hospitalDetails.staff?.length ?? 0} Personnel` : `${selectedHospital.staff_count || 0} Personnel`, color: '#008000' },
                      { icon: 'medical_information', label: "Patient Flow (Today)", value: hospitalDetails ? `${hospitalDetails.opd_count_today ?? 0} OPD Visits` : '—', color: '#8b5cf6' },
                      { icon: 'inventory_2', label: 'Supply Status', value: hospitalDetails ? `${hospitalDetails.stocks?.filter(s => (s.type === 'medicine' || !s.type) && s.status !== 'normal').length ?? 0} Low Stock Medicines` : '—', color: '#f59e0b' },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'white', borderRadius: '18px', padding: '20px', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '1.1rem', color: item.color }}>{item.icon}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
                        </div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', paddingLeft: '2px' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {detailsLoading ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #f1f5f9', borderTopColor: '#008000', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px' }}></div>
                    <span style={{ fontWeight: 600 }}>Analyzing facility data...</span>
                  </div>
                ) : hospitalDetails && (
                  <>
                    {/* Anomaly */}

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
                        <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', padding: '20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {hospitalDetails.stocks?.filter(s => (s.type === 'medicine' || !s.type) && s.status !== 'normal').map(s => (
                              <div key={s.medicine_name} style={{ background: '#f8fafc', padding: '12px 15px', borderRadius: '15px', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{s.medicine_name}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Stock: {s.closing_stock} {s.unit || 'units'}</span>
                                  <span style={{ fontSize: '0.7rem', color: '#e11d48', fontWeight: 700 }}>{s.status.replace('_', ' ').toUpperCase()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    )}

                    {/* OPD Trend Chart */}
                    <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, fontFamily: "'Outfit', sans-serif", color: '#0f172a' }}>OPD Performance Trend</h3>
                          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Tracking consultations history</p>
                        </div>
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '5px', borderRadius: '15px', gap: '4px' }}>
                          {['1W', '1M', '3M', '1Y'].map(t => (
                            <button
                              key={t}
                              onClick={() => setTrendRange(t)}
                              style={{
                                padding: '8px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                background: trendRange === t ? 'white' : 'transparent',
                                color: trendRange === t ? '#008000' : '#64748b',
                                fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s',
                                boxShadow: trendRange === t ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                              }}
                            >{t}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{ height: '240px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={hospitalDetails.opd_history}>
                            <defs>
                              <linearGradient id="opdGradModalDash" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#008000" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#008000" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', padding: '15px' }} />
                            <Area type="monotone" dataKey="count" stroke="#008000" strokeWidth={3} fillOpacity={1} fill="url(#opdGradModalDash)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Anomaly */}
                    {hospitalDetails.anomaly?.detected && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '18px', padding: '20px', display: 'flex', gap: '15px', alignItems: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>warning</span>
                        </div>
                        <p style={{ margin: 0, color: '#b91c1c', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4 }}>{hospitalDetails.anomaly.message}</p>
                      </div>
                    )}

                    {/* Staff Table */}
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span className="material-symbols-rounded" style={{ color: '#008000', fontSize: '1.1rem' }}>badge</span>Staff Attendance (Today)
                      </h3>
                      <div style={{ border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '14px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              {['Name', 'Role', 'Check-In', 'Check-Out', 'Status'].map(c => <th key={c} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{c}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {hospitalDetails.staff?.slice(0, 8).map(s => (
                              <tr key={s.staff_id} style={{ borderTop: '1px solid rgba(226, 232, 240, 0.5)' }}>
                                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{s.name}</td>
                                <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#64748b' }}>{s.role}</td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{s.check_in_time || '—'}</td>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>{s.check_out_time || '—'}</td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ padding: '3px 9px', borderRadius: '7px', fontSize: '0.68rem', fontWeight: 800, background: s.status === 'present' ? '#dcfce7' : '#fef2f2', color: s.status === 'present' ? '#16a34a' : '#dc2626' }}>
                                    {(s.status || 'absent').toUpperCase()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {(!hospitalDetails.staff || hospitalDetails.staff.length === 0) && (
                              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No staff records.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Recent Patient Visits */}
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span className="material-symbols-rounded" style={{ color: '#008000', fontSize: '1.1rem' }}>personal_injury</span>Recent Patients & Consultations
                      </h3>
                      <div style={{ border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '14px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              {['Patient Name', 'Age/Gen', 'Diagnosis', 'Medicines', 'Doctor Handled', 'Visit Date'].map(c => <th key={c} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{c}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {hospitalDetails.patients?.map((p, idx) => (
                              <tr key={idx} style={{ borderTop: '1px solid rgba(226, 232, 240, 0.5)' }}>
                                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{p.name}</td>
                                <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#64748b' }}>{p.age} yrs / {p.gender?.[0]}</td>
                                <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#64748b' }}>{p.diagnosis || '—'}</td>
                                <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{p.medicines || '—'}</td>
                                <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#64748b' }}>{p.doctor_handled || '—'}</td>
                                <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#64748b' }}>{p.visit_date}</td>
                              </tr>
                            ))}
                            {(!hospitalDetails.patients || hospitalDetails.patients.length === 0) && (
                              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No recent patient visits recorded.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Low Stock Items */}
                    {Object.values((hospitalDetails.stocks || []).reduce((acc, curr) => {
                      const nameKey = curr.medicine_name.toLowerCase().trim();
                      if (!acc[nameKey] || new Date(curr.last_updated) > new Date(acc[nameKey].last_updated)) acc[nameKey] = curr;
                      return acc;
                    }, {})).filter(s => (s.type === 'medicine' || !s.type) && s.max_capacity > 0 && s.closing_stock < s.max_capacity * 0.25).length > 0 && (
                        <div>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <span className="material-symbols-rounded" style={{ color: '#f59e0b', fontSize: '1.1rem' }}>inventory_2</span>Low Stock Items
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                            {Object.values(hospitalDetails.stocks.reduce((acc, curr) => {
                              const nameKey = curr.medicine_name.toLowerCase().trim();
                              if (!acc[nameKey] || new Date(curr.last_updated) > new Date(acc[nameKey].last_updated)) acc[nameKey] = curr;
                              return acc;
                            }, {}))
                              .filter(s => (s.type === 'medicine' || !s.type) && s.max_capacity > 0 && s.closing_stock < s.max_capacity * 0.25)
                              .map(st => {
                                const capitalizedName = st.medicine_name.charAt(0).toUpperCase() + st.medicine_name.slice(1).toLowerCase();
                                const updatedAt = st.last_updated ? new Date(st.last_updated).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '';
                                return (
                                  <div key={st.medicine_name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef3c7', borderRadius: '10px', padding: '10px 14px' }}>
                                    <div>
                                      <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.85rem' }}>{capitalizedName}</div>
                                      {updatedAt && <div style={{ fontSize: '0.65rem', color: '#b45309', opacity: 0.7, fontWeight: 600 }}>Updated: {updatedAt}</div>}
                                    </div>
                                    <span style={{ fontWeight: 800, color: '#b45309', fontSize: '0.85rem' }}>{st.closing_stock} units</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <style>{`
        @keyframes modalScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .stat-card-hover { transition: all 0.3s ease; }
        .stat-card-hover:hover { transform: translateY(-5px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border-color: var(--primary) !important; }
      `}</style>
      </div>
    </div>
  );
};

export default Dashboard;
