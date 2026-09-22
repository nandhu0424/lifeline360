import React, { useState, useEffect, useRef } from 'react';
import { stockService } from '../../../services/api';
import * as XLSX from 'xlsx';

const StockReport = ({ theme }) => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('medicine');
  const [editingStock, setEditingStock] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [newItem, setNewItem] = useState({ medicine_name: '', closing_stock: 0, max_capacity: 0, type: 'medicine' });

  const [requestItem, setRequestItem] = useState(null);
  const [requestForm, setRequestForm] = useState({ requested_quantity: 50, target_date: '', priority: 'Normal' });
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        // Normalize the data (convert keys and types to lowercase)
        const excelData = rawData.map(row => {
          const normalizedRow = {};
          for (let key in row) {
            normalizedRow[key.toLowerCase()] = row[key];
          }
          if (normalizedRow.type && typeof normalizedRow.type === 'string') {
            normalizedRow.type = normalizedRow.type.toLowerCase();
          }
          return normalizedRow;
        });

        await stockService.bulkUpload({ stocks: excelData });
        alert('Excel data uploaded successfully!');
        fetchStocks();
      } catch (error) {
        console.error(error);
        alert('Failed to upload Excel: ' + (error.message || error));
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const fetchStocks = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await stockService.getAll();
      if (res.data) setStocks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks(false);
    const interval = setInterval(() => {
      fetchStocks(true);
    }, 10000); // 10s polling interval to automatically catch DDHS dispatch updates
    return () => clearInterval(interval);
  }, []);

  const openRequestModal = (item) => {
    const defaultQty = item.max_capacity > 0 ? (item.max_capacity - item.closing_stock) : 50;
    const defaultDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setRequestForm({
      requested_quantity: defaultQty > 0 ? defaultQty : 50,
      target_date: defaultDate,
      priority: item.closing_stock <= 0 ? 'Urgent' : 'Normal'
    });
    setRequestItem(item);
  };

  const handleStockRequestSubmit = async () => {
    if (!requestItem) return;
    if (!requestForm.requested_quantity || requestForm.requested_quantity <= 0) {
      return alert('Please enter a valid requested quantity.');
    }
    setSaveLoading(true);
    try {
      await stockService.updateRequestStatus(requestItem._id, {
        status: 'requested',
        requested_quantity: requestForm.requested_quantity,
        target_date: requestForm.target_date,
        priority: requestForm.priority
      });
      alert(`Stock request for ${requestForm.requested_quantity} units of ${requestItem.medicine_name} submitted successfully (Priority: ${requestForm.priority}).`);
      setRequestItem(null);
      fetchStocks();
    } catch (err) {
      alert('Failed to send stock request: ' + (err.message || err));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleMarkReceived = async (id, medicine_name) => {
    if (!window.confirm(`Confirm receipt of dispatched stock for ${medicine_name}? Stock will be auto-added to hospital inventory.`)) {
      return;
    }
    try {
      await stockService.updateRequestStatus(id, { status: 'received' });
      alert(`Receipt confirmed for ${medicine_name}! Hospital closing stock updated successfully.`);
      fetchStocks();
    } catch (err) {
      alert('Failed to mark as received: ' + (err.message || err));
    }
  };

  const handleUpdateStock = async () => {
    if (!editingStock) return;
    setSaveLoading(true);
    try {
      await stockService.update(editingStock._id, editingStock);
      setEditingStock(null);
      fetchStocks();
    } catch (err) {
      alert('Failed to update stock: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.medicine_name) return alert('Please enter item name');
    setSaveLoading(true);
    try {
      await stockService.add(newItem);
      setShowAddModal(false);
      setNewItem({ medicine_name: '', closing_stock: 0, max_capacity: 0, type: activeTab });
      fetchStocks();
    } catch (err) {
      alert('Failed to add item: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredStocks = stocks.filter(s => (s.type || 'medicine') === activeTab);

  return (
    <div className="animate-fade-in" style={{ background: 'white', padding: '40px', borderRadius: '32px', border: `1px solid ${theme.border}`, boxShadow: theme.shadowLg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif", margin: 0, letterSpacing: '-1px' }}>Inventory & Stock</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: 600 }}>Monitor medicine and equipment availability</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ padding: '10px 20px', background: '#f0fdf4', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '10px', height: 'fit-content', border: '1px solid #dcfce7' }}>
            <span className="material-symbols-rounded" style={{ color: '#16a34a' }}>inventory_2</span>
            <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.9rem' }}>
              {filteredStocks.length} Total {activeTab === 'medicine' ? 'Medicines' : 'Equipments'}
            </span>
          </div>
          <button
            onClick={() => fetchStocks(false)}
            disabled={loading}
            title="Refresh stock status"
            style={{
              padding: '12px 18px', background: '#f0fdf4', color: '#16a34a',
              borderRadius: '14px', border: '1px solid #16a34a', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>refresh</span>
            Refresh
          </button>
          <button
            onClick={() => {
              setNewItem({ ...newItem, type: activeTab });
              setShowAddModal(true);
            }}
            className="btn btn-outline"
            style={{ padding: '12px 24px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
          >
            + Add New Item
          </button>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            style={{ padding: '12px 24px', background: '#008000', color: 'white', borderRadius: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 128, 0, 0.2)' }}
            onClick={() => fileInputRef.current.click()}
          >
            Upload Excel
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('medicine')}
          style={{ padding: '10px 25px', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer', background: activeTab === 'medicine' ? '#e8f5e9' : 'transparent', color: activeTab === 'medicine' ? '#008000' : '#64748b', transition: 'all 0.2s' }}
        >Medicines</button>
        <button
          onClick={() => setActiveTab('equipment')}
          style={{ padding: '10px 25px', borderRadius: '12px', fontWeight: 800, border: 'none', cursor: 'pointer', background: activeTab === 'equipment' ? '#e8f5e9' : 'transparent', color: activeTab === 'equipment' ? '#008000' : '#64748b', transition: 'all 0.2s' }}
        >Equipment</button>
      </div>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Item Name</th>
              <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Current Stock</th>
              {activeTab === 'medicine' && <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>}
              <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Last Updated</th>
              <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Supply Workflow</th>
              <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr> :
              filteredStocks.map(s => {
                const isCritical = s.status === 'critical' || s.closing_stock <= 0;
                const isLow = s.status === 'low_stock' || (s.max_capacity > 0 && s.closing_stock < (s.max_capacity * 0.25));
                const capitalizedName = s.medicine_name.charAt(0).toUpperCase() + s.medicine_name.slice(1).toLowerCase();
                const updatedAt = s.last_updated ? new Date(s.last_updated).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                }) : '—';

                return (
                  <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '20px 24px', fontWeight: 800, color: '#0f172a' }}>
                      {capitalizedName}
                    </td>
                    <td style={{ padding: '20px 24px', fontWeight: 800, fontSize: '1.1rem', color: isCritical ? '#dc2626' : isLow ? '#d97706' : '#0f172a' }}>
                      {s.closing_stock} <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>UNITS</span>
                    </td>
                    {activeTab === 'medicine' && (
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{
                          padding: '6px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800,
                          background: isCritical ? '#fef2f2' : isLow ? '#fffbeb' : '#f0fdf4',
                          color: isCritical ? '#dc2626' : isLow ? '#d97706' : '#16a34a'
                        }}>
                          {isCritical ? 'CRITICAL' : isLow ? 'LOW STOCK' : 'NORMAL'}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                      {updatedAt}
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                      {s.request_status === 'dispatched' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                          <button
                            onClick={() => handleMarkReceived(s._id, s.medicine_name)}
                            style={{ padding: '8px 16px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)' }}
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>inventory</span> Confirm Receipt ({s.dispatched_quantity > 0 ? s.dispatched_quantity : s.requested_quantity} Qty)
                          </button>
                          {s.estimated_delivery_date && (
                            <span style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 600 }}>
                              Est: {new Date(s.estimated_delivery_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : s.request_status === 'requested' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span style={{ color: '#d97706', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', background: '#fffbeb', padding: '4px 10px', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                            <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>hourglass_top</span> Request Pending
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 700 }}>
                            {s.requested_quantity} Units ({s.priority || 'Normal'})
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => openRequestModal(s)}
                          style={{ padding: '8px 16px', background: '#fffbeb', color: '#d97706', border: '1px solid #fef3c7', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          Request Stock
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <button
                        onClick={() => setEditingStock({ ...s })}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                      >
                        <span className="material-symbols-rounded">edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {/* Request Stock Modal */}
      {requestItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '35px', borderRadius: '24px', width: '450px', boxShadow: theme.shadowLg }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px', color: theme.textMain }}>
              Request Stock: {requestItem.medicine_name}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>
              Current stock is <strong>{requestItem.closing_stock} units</strong>. Submit a supply request to DDHS.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                  Requested Quantity (Units) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={requestForm.requested_quantity}
                  onChange={e => setRequestForm({ ...requestForm, requested_quantity: parseInt(e.target.value) || '' })}
                  style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: `1px solid ${theme.border}`, fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                  Target Delivery Date
                </label>
                <input
                  type="date"
                  value={requestForm.target_date}
                  onChange={e => setRequestForm({ ...requestForm, target_date: e.target.value })}
                  style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: `1px solid ${theme.border}`, fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                  Priority Level *
                </label>
                <select
                  value={requestForm.priority}
                  onChange={e => setRequestForm({ ...requestForm, priority: e.target.value })}
                  style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: `1px solid ${theme.border}`, fontWeight: 700, background: 'white' }}
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent (Low/Critical Shortage)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button
                  onClick={() => setRequestItem(null)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStockRequestSubmit}
                  disabled={saveLoading}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#d97706', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  {saveLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingStock && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '450px', boxShadow: theme.shadowLg }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '20px', color: theme.textMain }}>Update Stock</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: theme.textMuted }}>Item Name</label>
                <input disabled type="text" value={editingStock.medicine_name} style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: '#f8fafc' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: theme.textMuted }}>Current Stock</label>
                <input type="number" value={editingStock.closing_stock} onChange={e => setEditingStock({ ...editingStock, closing_stock: parseInt(e.target.value) })} style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: `1px solid ${theme.border}` }} />
              </div>
              {editingStock.type !== 'equipment' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: theme.textMuted }}>Max Capacity</label>
                  <input type="number" value={editingStock.max_capacity} onChange={e => setEditingStock({ ...editingStock, max_capacity: parseInt(e.target.value) })} style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: `1px solid ${theme.border}` }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setEditingStock(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={handleUpdateStock}
                  disabled={saveLoading}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: theme.primary, color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '24px', width: '450px', boxShadow: theme.shadowLg }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '20px', color: theme.textMain }}>Add New {activeTab === 'medicine' ? 'Medicine' : 'Equipment'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: theme.textMuted }}>Item Name</label>
                <input
                  type="text"
                  placeholder={activeTab === 'medicine' ? 'e.g. Paracetamol' : 'e.g. ECG Machine'}
                  value={newItem.medicine_name}
                  onChange={e => setNewItem({ ...newItem, medicine_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: `1px solid ${theme.border}` }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: theme.textMuted }}>{activeTab === 'medicine' ? 'Opening Stock' : 'Total Units'}</label>
                <input
                  type="number"
                  value={newItem.closing_stock}
                  onChange={e => setNewItem({ ...newItem, closing_stock: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: `1px solid ${theme.border}` }}
                />
              </div>
              {activeTab === 'medicine' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: theme.textMuted }}>Max Capacity</label>
                  <input
                    type="number"
                    value={newItem.max_capacity}
                    onChange={e => setNewItem({ ...newItem, max_capacity: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: `1px solid ${theme.border}` }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={handleAddItem}
                  disabled={saveLoading}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: theme.primary, color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  {saveLoading ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockReport;
