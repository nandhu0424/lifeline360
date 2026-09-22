import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { patientService, staffService, stockService } from '../../../services/api';

const PatientRecords = ({ theme }) => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [showAadhar, setShowAadhar] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  const [saveLoading, setSaveLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Female',
    aadhar: '',
    contact: '',
    purpose_of_visit: 'Out-Patient',
    doctor_handled: '',
    diagnosis: '',
    medicines: '',
    dosage: '',
    visit_date: '',
    visit_time: ''
  });

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPreviewData, setUploadPreviewData] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [downloadRange, setDownloadRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [patientRes, staffRes, stockRes, totalAllRes] = await Promise.all([
        patientService.getAll({ search: searchTerm, month, year, date: specificDate }),
        staffService.getAll(),
        stockService.getAll(),
        patientService.getAll({}) // Get all for total count
      ]);
      setPatients(patientRes.data || []);
      setTotalCount(totalAllRes.data?.length || 0);
      
      const medicalStaff = staffRes.data?.medical || [];
      const doctorList = medicalStaff.filter(s => s.role === 'Doctor');
      setDoctors(doctorList);
      
      // Filter stocks to only include medicines
      const medicineStocks = (stockRes.data || []).filter(s => s.type === 'medicine');
      setStocks(medicineStocks);
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, month, year, specificDate]);

  const handleSearch = () => {
    fetchData();
  };

  const handleOpenAdd = () => {
    setEditingPatient(null);
    setFormData({
      name: '',
      age: '',
      gender: 'Female',
      aadhar: '',
      contact: '',
      purpose_of_visit: 'Out-Patient',
      doctor_handled: doctors[0]?.name || '',
      diagnosis: '',
      medicines: '',
      dosage: '',
      visit_date: new Date().toISOString().split('T')[0],
      visit_time: new Date().toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })
    });
    setShowModal(true);
  };

  const handleOpenEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      age: patient.age || '',
      gender: patient.gender || 'Female',
      aadhar: patient.aadhar_masked || '', // In edit mode, we might not have full aadhar
      contact: patient.contact || '',
      purpose_of_visit: patient.purpose_of_visit || 'Out-Patient',
      doctor_handled: patient.doctor_handled || '',
      diagnosis: patient.diagnosis || '',
      medicines: patient.medicines || '',
      dosage: patient.prescriptions || '',
      visit_date: patient.visit_date || '',
      visit_time: patient.visit_time || ''
    });
    setShowModal(true);
  };

  const handleOpenHistory = async (patient) => {
    setSelectedPatientForHistory(patient);
    setHistoryLoading(true);
    setShowHistoryModal(true);
    try {
      const res = await patientService.getHistory(patient.patient_id);
      setPatientHistory(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAadharChange = async (val) => {
    setFormData({ ...formData, aadhar: val });
    if (val.length === 12 && /^\d+$/.test(val)) {
      try {
        const res = await patientService.lookup(val);
        if (res.success && res.data) {
          setFormData(prev => ({
            ...prev,
            name: res.data.name || prev.name,
            age: res.data.age || prev.age,
            gender: res.data.gender || prev.gender,
            contact: res.data.contact || prev.contact
          }));
        }
      } catch (err) {
        console.error('Autofetch failed', err);
      }
    }
  };

  const handleContactChange = async (val) => {
    setFormData({ ...formData, contact: val });
    if (val.length === 10 && /^\d+$/.test(val)) {
      try {
        const res = await patientService.lookup(val);
        if (res.success && res.data) {
          setFormData(prev => ({
            ...prev,
            name: res.data.name || prev.name,
            age: res.data.age || prev.age,
            gender: res.data.gender || prev.gender,
            aadhar: res.data.aadhar_masked || prev.aadhar
          }));
        }
      } catch (err) {
        console.error('Contact autofetch failed', err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.aadhar || formData.aadhar.length < 12) {
      alert('Valid 12-digit Aadhar Number is required.');
      return;
    }
    setSaveLoading(true);
    try {
      const payload = { ...formData, prescriptions: formData.dosage };
      if (editingPatient) {
        await patientService.update(editingPatient._id, payload);
      } else {
        await patientService.add(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to save record: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    // Filter patients within range
    const filtered = patients.filter(p => {
      const date = p.visit_date;
      return date >= downloadRange.start && date <= downloadRange.end;
    });

    if (filtered.length === 0) {
      alert('No records found in this date range.');
      return;
    }

    const data = filtered.map(p => ({
      'Aadhar': p.aadhar_masked || 'Not provided',
      'Name': p.name,
      'Age': p.age,
      'Gender': p.gender,
      'Contact': p.contact,
      'Type': p.purpose_of_visit,
      'Doctor': p.doctor_handled,
      'Visit Date': p.visit_date,
      'Visit Time': p.visit_time,
      'Diagnosis': p.diagnosis,
      'Prescription': p.medicines,
      'Dosage': p.prescriptions
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Patient Records");
    
    const fileName = `Patient_Records_${downloadRange.start}_to_${downloadRange.end}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    setShowDownloadModal(false);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          showToast('Excel file is empty or has no data rows.', 'error');
          return;
        }

        const formatExcelDate = (val) => {
          if (!val) return '';
          if (val instanceof Date) return val.toISOString().split('T')[0];
          const num = Number(val);
          if (!isNaN(num) && num > 30000 && num < 60000) {
            const date = new Date(Date.UTC(1899, 11, 30 + num));
            return date.toISOString().split('T')[0];
          }
          return val.toString();
        };

        const mappedData = rawData.map((row, idx) => ({
          _rowIndex: idx + 2, // Excel row number (1-indexed header + data)
          aadhar: row['Aadhar']?.toString(),
          name: row['Name'],
          age: row['Age'],
          gender: row['Gender'],
          contact: row['Contact']?.toString(),
          purpose_of_visit: row['Type'],
          doctor_handled: row['Doctor'],
          visit_date: formatExcelDate(row['Visit Date']),
          visit_time: row['Visit Time']?.toString(),
          diagnosis: row['Diagnosis'],
          medicines: row['Prescription'],
          prescriptions: row['Dosage']
        }));

        setUploadPreviewData(mappedData);
      } catch (err) {
        console.error(err);
        showToast('Error parsing Excel file. Please check the column format.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!uploadPreviewData || uploadPreviewData.length === 0) return;
    setUploadLoading(true);
    try {
      const res = await patientService.bulkUpload({ patients: uploadPreviewData });
      if (res.success) {
        showToast(`✓ ${uploadPreviewData.length} records uploaded successfully!`, 'success');
        setShowUploadModal(false);
        setUploadPreviewData(null);
        fetchData();
      } else {
        showToast('Upload failed: ' + res.message, 'error');
      }
    } catch (err) {
      showToast('Upload error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          padding: '14px 22px', borderRadius: '14px', fontWeight: 700, fontSize: '0.9rem',
          background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'slideInRight 0.3s ease'
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Patient Records</h2>
            <div style={{ background: '#e8f5e9', padding: '8px 16px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: '#008000', fontSize: '20px' }}>group</span>
              <span style={{ color: '#008000', fontWeight: 800, fontSize: '0.9rem' }}>{patients.length} / {totalCount} Records</span>
            </div>
          </div>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: 600, fontSize: '0.95rem' }}>Manage securely encrypted patient data</p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            onClick={handleOpenAdd}
            style={{ padding: '12px 25px', background: '#e8f5e9', color: '#008000', borderRadius: '100px', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>add</span>
            Manual Entry
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            style={{ padding: '12px 25px', background: '#008000', color: 'white', borderRadius: '100px', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Upload Excel
          </button>
        </div>
      </div>

      {/* Search Bar Section */}
      <div style={{ background: 'white', padding: '15px', borderRadius: '18px', border: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', gap: '12px', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            type="text" 
            placeholder="Search Name, ID, Contact..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ width: '100%', padding: '12px 20px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#f8fafc', outline: 'none', fontSize: '0.9rem', fontWeight: 600 }}
          />
        </div>
        <select value={month} onChange={(e) => { setMonth(e.target.value); if (e.target.value) setSpecificDate(''); }} style={{ padding: '0 15px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', outline: 'none' }}>
          <option value="">All Months</option>
          {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
            <option key={m} value={i+1}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => { setYear(e.target.value); if (e.target.value) setSpecificDate(''); }} style={{ padding: '0 15px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', outline: 'none' }}>
          <option value="">All Years</option>
          {[2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Or Specific Date:</span>
          <input
            type="date"
            value={specificDate}
            onChange={(e) => {
              setSpecificDate(e.target.value);
              if (e.target.value) {
                setMonth('');
                setYear('');
              }
            }}
            style={{ padding: '10px 15px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: 600, color: '#64748b', fontSize: '0.85rem', outline: 'none' }}
          />
        </div>
        <button 
          onClick={handleSearch}
          style={{ padding: '0 25px', background: '#1e293b', color: 'white', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}
        >
          Search
        </button>
      </div>

      {/* Table Section */}
      <div style={{ background: 'white', borderRadius: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
              <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Patient ID / Aadhar</th>
              <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Name & Contact</th>
              <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Doctor</th>
              <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Visit Info</th>
              <th style={{ padding: '20px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => {
              const formattedVisitDate = (() => {
                const val = p.visit_date;
                const num = Number(val);
                if (!isNaN(num) && num > 30000 && num < 60000) {
                  const date = new Date(Date.UTC(1899, 11, 30 + num));
                  return date.toISOString().split('T')[0];
                }
                return val;
              })();

              return (
                <tr key={p._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '20px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{p.patient_id}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Aadhar: {p.aadhar_masked || 'Not provided'}</div>
                </td>
                <td style={{ padding: '20px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{p.name} ({p.age}, {p.gender?.[0]})</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{p.contact}</div>
                </td>
                <td style={{ padding: '20px' }}>
                  <span style={{ 
                    padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                    background: p.purpose_of_visit === 'Out-Patient' ? '#ecfdf5' : p.purpose_of_visit === 'In-Patient' ? '#fef2f2' : '#eff6ff',
                    color: p.purpose_of_visit === 'Out-Patient' ? '#10b981' : p.purpose_of_visit === 'In-Patient' ? '#ef4444' : '#3b82f6'
                  }}>
                    {p.purpose_of_visit?.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '20px', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                  {p.doctor_handled || 'Unassigned'}
                </td>
                    <td style={{ padding: '20px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{formattedVisitDate}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{p.visit_time || '--:--'}</div>
                    </td>
                <td style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleOpenHistory(p)}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>history</span>
                    </button>
                    <button 
                      onClick={() => handleOpenEdit(p)}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0fdf4', color: '#10b981', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>edit</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
            {patients.length === 0 && !loading && (
              <tr><td colSpan="6" style={{ padding: '100px', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>No patient records found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Section - Edit/Add Patient */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ 
            background: 'white', 
            width: '500px', 
            maxHeight: '95vh', 
            overflowY: 'auto', 
            borderRadius: '28px', 
            padding: '25px', 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', 
            position: 'relative' 
          }}>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 850, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>{editingPatient ? 'Edit Patient' : 'Manual Entry'}</h3>
            <p style={{ margin: '5px 0 20px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>{editingPatient ? 'Update clinical details for this visit.' : 'Register a new patient visit.'}</p>
            
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Patient Name</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }} placeholder="Full Name" />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Age</label>
                <input required type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }} placeholder="Years" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Gender</label>
                <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              {!editingPatient && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Aadhar Number (Required)</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      required 
                      type={showAadhar ? "text" : "password"} 
                      maxLength={12} 
                      value={formData.aadhar} 
                      onChange={(e) => handleAadharChange(e.target.value)} 
                      style={{ width: '100%', padding: '12px 50px 12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }} 
                      placeholder="12 Digit Aadhar" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowAadhar(!showAadhar)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <span className="material-symbols-rounded">
                        {showAadhar ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Contact Number</label>
                <input required type="text" maxLength={10} value={formData.contact} onChange={(e) => handleContactChange(e.target.value)} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }} placeholder="10 Digit Mobile" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Purpose</label>
                <select value={formData.purpose_of_visit} onChange={(e) => setFormData({...formData, purpose_of_visit: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
                  <option>Out-Patient</option>
                  <option>In-Patient</option>
                  <option>Discharged</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Doctor Assigned</label>
                <select value={formData.doctor_handled} onChange={(e) => setFormData({...formData, doctor_handled: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
                  {doctors.map(doc => <option key={doc._id} value={doc.name}>{doc.name}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Diagnosis</label>
                <textarea rows="2" value={formData.diagnosis} onChange={(e) => setFormData({...formData, diagnosis: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600, fontFamily: 'inherit' }} placeholder="Clinical findings..." />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Visit Date</label>
                <input required type="date" value={formData.visit_date} onChange={(e) => setFormData({...formData, visit_date: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Visit Time</label>
                <input required type="time" value={formData.visit_time} onChange={(e) => setFormData({...formData, visit_time: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Prescription (Select from Stock)</label>
                <select value={formData.medicines} onChange={(e) => setFormData({...formData, medicines: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600, marginBottom: '10px' }}>
                  <option value="">+ Add more medicines...</option>
                  {stocks.map(s => <option key={s._id} value={s.medicine_name}>{s.medicine_name}</option>)}
                </select>
                <textarea rows="2" value={formData.dosage} onChange={(e) => setFormData({...formData, dosage: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600, fontFamily: 'inherit' }} placeholder="Dosage and instructions for selected medicines..." />
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button type="submit" disabled={saveLoading} style={{ flex: 1, padding: '15px', background: '#008000', color: 'white', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                  {saveLoading ? 'Saving...' : editingPatient ? 'Update Record' : 'Register Patient'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '15px', background: '#f1f5f9', color: '#64748b', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal Section */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '700px', borderRadius: '28px', padding: '35px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 850, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>Patient History</h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>Loading history...</div>
            ) : (
              <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
                {selectedPatientForHistory && (
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '18px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 850, color: '#0f172a' }}>{selectedPatientForHistory.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{selectedPatientForHistory.age} Years • {selectedPatientForHistory.gender}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: theme.primary }}>{selectedPatientForHistory.contact}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Patient ID: {selectedPatientForHistory.patient_id}</div>
                    </div>
                  </div>
                )}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Type</th>
                      <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Doctor</th>
                      <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Diagnosis</th>
                      <th style={{ padding: '12px', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Prescription</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientHistory.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '12px', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{h.visit_date}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ 
                            fontSize: '0.65rem', fontWeight: 800, 
                            color: h.purpose_of_visit === 'Out-Patient' ? '#10b981' : h.purpose_of_visit === 'In-Patient' ? '#ef4444' : '#3b82f6' 
                          }}>{h.purpose_of_visit?.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{h.doctor_handled}</td>
                        <td style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>{h.diagnosis}</td>
                        <td style={{ padding: '12px', fontSize: '0.85rem', color: theme.primary, fontWeight: 600 }}>
                          <div style={{ color: '#008000', fontWeight: 800 }}>{h.medicines}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>{h.prescriptions}</div>
                        </td>
                      </tr>
                    ))}
                    {patientHistory.length === 0 && (
                      <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No previous visits found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .material-symbols-rounded { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
      {/* Floating Download Button */}
      <button 
        onClick={() => setShowDownloadModal(true)}
        style={{ position: 'fixed', bottom: '30px', right: '30px', width: '60px', height: '60px', borderRadius: '50%', background: theme.primary, color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '30px' }}>download</span>
      </button>

      {/* Download Modal */}
      {showDownloadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 2001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '400px', borderRadius: '28px', padding: '35px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 850, color: '#0f172a', marginBottom: '20px' }}>Download Records</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>Start Date</label>
              <input type="date" value={downloadRange.start} onChange={(e) => setDownloadRange({...downloadRange, start: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }} />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>End Date</label>
              <input type="date" value={downloadRange.end} onChange={(e) => setDownloadRange({...downloadRange, end: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', fontWeight: 600 }} />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={handleDownloadExcel} style={{ flex: 1, padding: '15px', background: theme.primary, color: 'white', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Download Excel</button>
              <button onClick={() => setShowDownloadModal(false)} style={{ flex: 1, padding: '15px', background: '#f1f5f9', color: '#64748b', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 2001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: uploadPreviewData ? '900px' : '500px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: '28px', padding: '35px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)', transition: 'width 0.3s ease' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 850, color: '#0f172a' }}>
                  {uploadPreviewData ? '📋 Preview & Confirm Upload' : 'Bulk Upload Instructions'}
                </h3>
                {uploadPreviewData && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                    <span style={{ background: '#e8f5e9', color: '#008000', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 800 }}>
                      {uploadPreviewData.length} Records Ready
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Review before confirming</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => { setShowUploadModal(false); setUploadPreviewData(null); }}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '12px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#64748b' }}>close</span>
              </button>
            </div>

            {!uploadPreviewData ? (
              /* Step 1: Instructions + File Select */
              <>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '18px', marginBottom: '25px', border: '1px solid #f1f5f9' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>📌 Required Excel Column Headers:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {['Aadhar (12 digits)', 'Name', 'Age', 'Gender (Male/Female)', 'Contact (10 digits)', 'Type (In/Out-Patient/Discharged)', 'Doctor', 'Visit Date (YYYY-MM-DD)', 'Visit Time (HH:MM)', 'Diagnosis', 'Prescription', 'Dosage'].map(h => (
                      <span key={h} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#008000', fontWeight: 800 }}>•</span> {h}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <label style={{ width: '100%', padding: '25px', background: '#f0fdf4', color: '#008000', borderRadius: '16px', fontWeight: 800, border: '2px dashed #86efac', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '40px' }}>upload_file</span>
                    <span style={{ fontSize: '1rem' }}>Click to Select Excel File</span>
                    <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>.xlsx or .xls format</span>
                    <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                  <button onClick={() => { setShowUploadModal(false); setUploadPreviewData(null); }} style={{ width: '100%', padding: '15px', background: '#f1f5f9', color: '#64748b', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Cancel</button>
                </div>
              </>
            ) : (
              /* Step 2: Preview Table + Confirm */
              <>
                <div style={{ overflowX: 'auto', marginBottom: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['#', 'Aadhar', 'Name', 'Age/Gen', 'Contact', 'Type', 'Doctor', 'Visit Date', 'Diagnosis'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.5px', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadPreviewData.slice(0, 20).map((row, i) => {
                        const missingRequired = !row.name || !row.visit_date;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f8fafc', background: missingRequired ? '#fef2f2' : 'transparent' }}>
                            <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 700 }}>{row._rowIndex || i + 2}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                              {row.aadhar ? ('****' + row.aadhar.toString().slice(-4)) : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                              {row.name || <span style={{ color: '#ef4444', fontWeight: 800 }}>⚠ Missing</span>}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>{row.age || '—'} / {row.gender?.[0] || '—'}</td>
                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{row.contact || '—'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800,
                                background: row.purpose_of_visit === 'Out-Patient' ? '#ecfdf5' : row.purpose_of_visit === 'In-Patient' ? '#fef2f2' : '#eff6ff',
                                color: row.purpose_of_visit === 'Out-Patient' ? '#10b981' : row.purpose_of_visit === 'In-Patient' ? '#ef4444' : '#3b82f6'
                              }}>
                                {row.purpose_of_visit || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.doctor_handled || '—'}</td>
                            <td style={{ padding: '10px 14px', color: missingRequired && !row.visit_date ? '#ef4444' : '#0f172a', fontWeight: missingRequired && !row.visit_date ? 800 : 600, whiteSpace: 'nowrap' }}>
                              {row.visit_date || <span style={{ color: '#ef4444' }}>⚠ Missing</span>}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.diagnosis || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {uploadPreviewData.length > 20 && (
                    <div style={{ padding: '12px 20px', background: '#f8fafc', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, borderTop: '1px solid #f1f5f9' }}>
                      + {uploadPreviewData.length - 20} more rows not shown in preview
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleConfirmUpload}
                    disabled={uploadLoading}
                    style={{ flex: 1, padding: '15px', background: uploadLoading ? '#86efac' : '#008000', color: 'white', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: uploadLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.95rem' }}
                  >
                    {uploadLoading ? (
                      <><span className="material-symbols-rounded" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>refresh</span>Uploading...</>
                    ) : (
                      <><span className="material-symbols-rounded" style={{ fontSize: '18px' }}>cloud_upload</span>Confirm & Upload {uploadPreviewData.length} Records</>
                    )}
                  </button>
                  <button
                    onClick={() => setUploadPreviewData(null)}
                    style={{ padding: '15px 20px', background: '#f1f5f9', color: '#64748b', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}
                  >
                    ← Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRecords;
