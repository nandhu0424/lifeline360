import React, { useState, useEffect } from 'react';
import { stockService } from '../../services/api';
import '../../styles/App.css';

const StocksReports = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [dispatchItem, setDispatchItem] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({ dispatched_quantity: 50, estimated_delivery_date: '', remarks: '' });
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await stockService.getAll();
      setStocks(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDispatchModal = (item) => {
    // Use requested_quantity if > 0, else fall back to closing_stock or 50
    const defaultQty = (item.requested_quantity != null && item.requested_quantity > 0)
      ? item.requested_quantity
      : (item.closing_stock || 50);
    const defaultDate = item.target_date
      ? new Date(item.target_date).toISOString().split('T')[0]
      : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setDispatchForm({
      dispatched_quantity: defaultQty,
      estimated_delivery_date: defaultDate,
      remarks: 'Stock dispatched from District Central Warehouse'
    });
    setDispatchItem(item);
  };

  const handleDispatchSubmit = async () => {
    if (!dispatchItem) return;
    if (!dispatchForm.dispatched_quantity || dispatchForm.dispatched_quantity <= 0) {
      return alert('Please enter a valid dispatched quantity.');
    }
    setSubmitLoading(true);
    try {
      await stockService.updateRequestStatus(dispatchItem._id, {
        status: 'dispatched',
        dispatched_quantity: dispatchForm.dispatched_quantity,
        estimated_delivery_date: dispatchForm.estimated_delivery_date,
        remarks: dispatchForm.remarks
      });
      alert(`Stock dispatch confirmed for ${dispatchItem.medicine_name} (${dispatchForm.dispatched_quantity} units). Notification sent to PHC.`);
      setDispatchItem(null);
      fetchData();
    } catch (err) {
      alert('Failed to dispatch stock: ' + (err.message || err));
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredStocks = stocks.filter(s => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'low_stock') return s.status === 'low_stock';
    if (activeFilter === 'requested') return s.request_status === 'requested';
    return true;
  });

  const toggleFilter = (type) => {
    setActiveFilter(prev => prev === type ? 'all' : type);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '30px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>District Stock Inventory</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Real-time medicine tracking and supply chain management</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                Clear Filter <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
              </button>
            )}
            <button onClick={fetchData} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded">refresh</span> Refresh Data
            </button>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div
            onClick={() => setActiveFilter('all')}
            className="glass-card"
            style={{
              padding: '24px',
              background: activeFilter === 'all' ? '#f8fafc' : 'linear-gradient(135deg, #f8fafc 0%, #fff 100%)',
              borderLeft: '4px solid #64748b',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: activeFilter === 'all' ? 'scale(1.02)' : 'none',
              boxShadow: activeFilter === 'all' ? '0 10px 25px rgba(100, 116, 139, 0.1)' : 'none'
            }}
          >
            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase' }}>Total Items</p>
            <h4 style={{ fontSize: '2.5rem', color: '#334155', margin: 0 }}>
              {stocks.length}
            </h4>
          </div>
          <div
            onClick={() => toggleFilter('low_stock')}
            className="glass-card"
            style={{
              padding: '24px',
              background: activeFilter === 'low_stock' ? '#fffbeb' : 'linear-gradient(135deg, #fffbeb 0%, #fff 100%)',
              borderLeft: '4px solid var(--warning)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: activeFilter === 'low_stock' ? 'scale(1.02)' : 'none',
              boxShadow: activeFilter === 'low_stock' ? '0 10px 25px rgba(217, 119, 6, 0.1)' : 'none'
            }}
          >
            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase' }}>Low Stock Items</p>
            <h4 style={{ fontSize: '2.5rem', color: 'var(--warning)', margin: 0 }}>
              {stocks.filter(s => s.status === 'low_stock').length}
            </h4>
          </div>
          <div
            onClick={() => toggleFilter('requested')}
            className="glass-card"
            style={{
              padding: '24px',
              background: activeFilter === 'requested' ? '#eff6ff' : 'linear-gradient(135deg, #eff6ff 0%, #fff 100%)',
              borderLeft: '4px solid var(--primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: activeFilter === 'requested' ? 'scale(1.02)' : 'none',
              boxShadow: activeFilter === 'requested' ? '0 10px 25px rgba(59, 130, 246, 0.1)' : 'none'
            }}
          >
            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase' }}>Pending Requests</p>
            <h4 style={{ fontSize: '2.5rem', color: 'var(--primary)', margin: 0 }}>
              {stocks.filter(s => s.request_status === 'requested').length}
            </h4>
          </div>
        </div>

        <div className="glass-panel p-0" style={{ overflow: 'hidden', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px', color: '#64748b' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '3rem', display: 'block', marginBottom: '10px' }}>hourglass_empty</span>
              Loading inventory...
            </div>
          ) : (
            <div className="table-container">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Medicine Name</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Hospital ID</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Current Stock</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Alert & Request Status</th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Workflow Action</th>
                  </tr>
                </thead>
                <tbody style={{ background: 'white' }}>
                  {filteredStocks.length > 0 ? (
                    filteredStocks.map(item => (
                      <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '20px 24px', fontWeight: 800, color: '#0f172a' }}>{item.medicine_name}</td>
                        <td style={{ padding: '20px 24px', color: '#475569', fontWeight: 600 }}>{item.hospital_id}</td>
                        <td style={{ padding: '20px 24px', color: '#0f172a', fontWeight: 700 }}>
                          {item.closing_stock} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>units</span>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              width: 'fit-content',
                              background: item.status === 'normal' ? '#dcfce7' : item.status === 'critical' ? '#fef2f2' : '#fffbeb',
                              color: item.status === 'normal' ? '#16a34a' : item.status === 'critical' ? '#dc2626' : '#d97706'
                            }}>
                              {item.status.replace('_', ' ').toUpperCase()}
                            </span>
                            {item.request_status === 'requested' && (
                              <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700 }}>
                                Req: {item.requested_quantity != null && item.requested_quantity > 0 ? item.requested_quantity : '—'} Qty ({item.priority || 'Normal'})
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                          {item.request_status === 'requested' ? (
                            <button
                              onClick={() => openDispatchModal(item)}
                              className="btn btn-primary"
                              style={{ padding: '8px 18px', fontSize: '0.75rem', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', background: '#0284c7', color: 'white', border: 'none', boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)' }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '1rem' }}>local_shipping</span> Dispatch Stock
                            </button>
                          ) : item.request_status === 'dispatched' ? (
                            <div style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '8px 14px',
                              background: '#f0fdf4',
                              borderRadius: '12px',
                              border: '1px solid #dcfce7'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span className="material-symbols-rounded" style={{ fontSize: '1.1rem', color: '#16a34a' }}>check_circle</span>
                                <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>Dispatched ({item.dispatched_quantity} Units)</span>
                              </div>
                              {item.estimated_delivery_date && (
                                <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 600 }}>
                                  Est. Delivery: {new Date(item.estimated_delivery_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>No pending requests</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '50px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                        No items found matching the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Stock Dispatch Modal */}
      {dispatchItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '35px', borderRadius: '24px', width: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px', color: '#0f172a' }}>
              Dispatch Stock: {dispatchItem.medicine_name}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>
              Hospital: <strong>{dispatchItem.hospital_id}</strong> | Requested: <strong>{dispatchItem.requested_quantity > 0 ? dispatchItem.requested_quantity : '—'} units</strong> ({dispatchItem.priority || 'Normal'} priority)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                  Dispatched Quantity (Units) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={dispatchForm.dispatched_quantity}
                  onChange={e => setDispatchForm({ ...dispatchForm, dispatched_quantity: parseInt(e.target.value) || '' })}
                  style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                  Estimated Delivery Date *
                </label>
                <input
                  type="date"
                  value={dispatchForm.estimated_delivery_date}
                  onChange={e => setDispatchForm({ ...dispatchForm, estimated_delivery_date: e.target.value })}
                  style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 700, fontSize: '0.85rem', color: '#334155' }}>
                  Remarks / Transit Note
                </label>
                <textarea
                  rows="3"
                  value={dispatchForm.remarks}
                  onChange={e => setDispatchForm({ ...dispatchForm, remarks: e.target.value })}
                  placeholder="Enter dispatch notes, carrier name, or tracking details..."
                  style={{ width: '100%', padding: '10px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 500, fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button
                  onClick={() => setDispatchItem(null)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispatchSubmit}
                  disabled={submitLoading}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: '#0284c7', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitLoading ? 'Dispatching...' : 'Dispatch Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StocksReports;
