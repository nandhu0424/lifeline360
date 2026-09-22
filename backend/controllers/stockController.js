const Stock = require('../models/Stock');
const Patient = require('../models/Patient');

// @desc    Get stock status for all hospitals in district
// @route   GET /api/stocks
const getStocks = async (req, res) => {
  try {
    const filter = { ...req.districtFilter };

    // For PHC users, strictly enforce their own hospital_id
    if (req.user.role === 'phc') {
      filter.hospital_id = req.user.hospital_id;
    } else if (req.query.hospital_id) {
      filter.hospital_id = req.query.hospital_id;
    }

    const stocks = await Stock.find(filter).sort({ status: -1, medicine_name: 1 });
    res.json({ success: true, count: stocks.length, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get only low/critical stock items
// @route   GET /api/stocks/low
const getLowStocks = async (req, res) => {
  try {
    const filter = {
      ...req.districtFilter,
      status: { $in: ['low_stock', 'critical'] },
      type: 'medicine'
    };

    if (req.user.role === 'phc') {
      filter.hospital_id = req.user.hospital_id;
    }

    const stocks = await Stock.find(filter).sort({ status: -1, closing_stock: 1 });

    res.json({ success: true, count: stocks.length, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a stock item (with history)
// @route   PUT /api/stocks/:id
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { closing_stock, type, max_capacity } = req.body;
    const { name: edited_by } = req.user; // Assuming req.user has name

    const stock = await Stock.findById(id);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });

    const previous_count = stock.closing_stock;

    if (closing_stock !== undefined) stock.closing_stock = closing_stock;
    if (type !== undefined) stock.type = type;
    if (max_capacity !== undefined) stock.max_capacity = max_capacity;

    stock.edit_history.push({
      previous_count,
      new_count: stock.closing_stock,
      edited_by: edited_by || 'Unknown',
      edited_at: new Date()
    });

    stock.last_updated = new Date();
    await stock.save(); // pre-save will auto-compute status

    // Check if type is medicine and it's less than 25% of max_capacity for auto-alert
    // We can handle auto-alerts logic here if needed, or in a cron job, or let the dashboard do it.

    res.json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk upload stocks via Excel JSON
// @route   POST /api/stocks/bulk
const bulkUploadStocks = async (req, res) => {
  try {
    const { hospital_id, district } = req.user;
    const { stocks } = req.body; // array

    if (!stocks || !Array.isArray(stocks)) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    for (const item of stocks) {
      const existingStock = await Stock.findOne({ hospital_id, medicine_name: item.medicine_name });
      if (existingStock) {
        existingStock.edit_history.push({
          previous_count: existingStock.closing_stock,
          new_count: item.closing_stock !== undefined ? item.closing_stock : existingStock.closing_stock,
          edited_by: req.user.name || 'System Bulk',
          edited_at: new Date()
        });
        if (item.closing_stock !== undefined) existingStock.closing_stock = item.closing_stock;
        if (item.type !== undefined) existingStock.type = item.type;
        if (item.max_capacity !== undefined) existingStock.max_capacity = item.max_capacity;
        existingStock.last_updated = new Date();
        await existingStock.save();
      } else {
        await Stock.create({
          hospital_id,
          district,
          ...item
        });
      }
    }

    res.json({ success: true, message: 'Bulk stock update successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send a manual alert to DDHS for stock
// @route   POST /api/stocks/alert
const manualAlert = async (req, res) => {
  try {
    const { hospital_id, district } = req.user;
    const { medicine_name, message } = req.body;

    const Alert = require('../models/Alert');
    await Alert.create({
      hospital_id,
      district,
      type: 'stock_shortage',
      message: message || `Manual alert: Stock shortage for ${medicine_name}`,
      severity: 'high',
      status: 'active'
    });

    res.json({ success: true, message: 'Alert sent successfully to DDHS' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a new stock item
// @route   POST /api/stocks
const addStock = async (req, res) => {
  try {
    const { hospital_id, district } = req.user;
    const { medicine_name, closing_stock, max_capacity, type, unit } = req.body;

    const existing = await Stock.findOne({ hospital_id, medicine_name });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Item already exists' });
    }

    const stock = await Stock.create({
      hospital_id,
      district,
      medicine_name,
      closing_stock,
      max_capacity,
      type: type || 'medicine',
      unit: unit || 'units',
      last_updated: new Date()
    });

    res.status(201).json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update stock request status (workflow)
// @route   POST /api/stocks/:id/request-status
const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status: new_status,
      requested_quantity,
      target_date,
      priority,
      dispatched_quantity,
      estimated_delivery_date,
      remarks
    } = req.body;
    const { hospital_id, district, role, name } = req.user;
    const userRole = (role || '').toUpperCase();

    const stock = await Stock.findById(id);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });

    const Alert = require('../models/Alert');
    let updateFields = { last_updated: new Date() };

    // ── PHC: Submit Request ────────────────────────────────────────────────────
    if (new_status === 'requested' && (userRole === 'PHC' || userRole === 'ADMIN')) {
      const reqQty = Number(requested_quantity) || 0;
      const prio = priority || 'Normal';

      updateFields = {
        ...updateFields,
        request_status: 'requested',
        requested_quantity: reqQty,
        priority: prio,
        ...(target_date ? { target_date } : {})
      };

      // Compute stock status after update
      const cs = stock.closing_stock;
      const mc = stock.max_capacity;
      const mt = stock.minimum_threshold;
      // const isBelow25 = mc > 0 && cs < mc * 0.25;
      // const isBelowThreshold = cs < mt;
      // updateFields.status = cs <= 0 ? 'critical' : (isBelow25 || isBelowThreshold ? 'low_stock' : 'normal');

      await Stock.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: false });

      await Alert.create({
        alert_id: `SR-${Date.now()}`,
        hospital_id: stock.hospital_id,
        district: stock.district || district,
        type: 'stock_request',
        message: `Stock request for ${stock.medicine_name} (${reqQty} units, Priority: ${prio}) from ${stock.hospital_id}`,
        severity: prio === 'Urgent' ? 'high' : 'medium',
        status: 'pending'
      });
    }
    // ── DDHS: Dispatch Stock ──────────────────────────────────────────────────
    else if (new_status === 'dispatched' && (userRole === 'DDHS' || userRole === 'ADMIN')) {
      const dispQty = Number(dispatched_quantity) || 0;

      updateFields = {
        ...updateFields,
        request_status: 'dispatched',
        dispatched_quantity: dispQty,
        ...(estimated_delivery_date ? { estimated_delivery_date } : {}),
        ...(remarks !== undefined ? { remarks } : {})
      };

      await Stock.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: false });

      await Alert.create({
        alert_id: `SD-${Date.now()}`,
        hospital_id: stock.hospital_id,
        district: stock.district || district,
        type: 'stock_dispatched',
        message: `DDHS dispatched ${dispQty} units of ${stock.medicine_name}. Est. Delivery: ${estimated_delivery_date ? new Date(estimated_delivery_date).toLocaleDateString() : 'N/A'}`,
        severity: 'low',
        status: 'sent'
      });

      const updated = await Stock.findById(id).lean();
      return res.json({ success: true, data: updated });
    }
    // ── PHC: Confirm Receipt ──────────────────────────────────────────────────
    else if (new_status === 'received' && (userRole === 'PHC' || userRole === 'ADMIN')) {
      const dispQty = Number(stock.dispatched_quantity) > 0
        ? Number(stock.dispatched_quantity)
        : Number(stock.requested_quantity || 0);
      const previousCount = stock.closing_stock;
      const newCount = previousCount + dispQty;

      // Compute new status
      const mc = stock.max_capacity;
      const mt = stock.minimum_threshold;
      const isBelow25 = mc > 0 && newCount < mc * 0.25;
      const isBelowThreshold = newCount < mt;
      const newStatus = newCount <= 0 ? 'critical' : (isBelow25 || isBelowThreshold ? 'low_stock' : 'normal');

      const historyEntry = {
        previous_count: previousCount,
        new_count: newCount,
        edited_by: name || hospital_id || 'PHC Staff',
        edited_at: new Date()
      };

      updateFields = {
        ...updateFields,
        closing_stock: newCount,
        request_status: 'none',
        requested_quantity: 0,
        dispatched_quantity: 0,
        priority: 'Normal',
        status: newStatus
      };

      await Stock.findByIdAndUpdate(id, {
        $set: updateFields,
        $push: { edit_history: historyEntry }
      }, { new: true, runValidators: false });

      await Alert.create({
        alert_id: `SRV-${Date.now()}`,
        hospital_id: stock.hospital_id,
        district: stock.district || district,
        type: 'stock_received',
        message: `${stock.hospital_id} confirmed receipt of ${dispQty} units of ${stock.medicine_name}. New closing stock: ${newCount}.`,
        severity: 'low',
        status: 'resolved'
      });

      const updated = await Stock.findById(id).lean();
      return res.json({ success: true, data: updated });
    }

    const updatedStock = await Stock.findById(id).lean();
    res.json({ success: true, data: updatedStock });
  } catch (error) {
    console.error('updateRequestStatus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getStocks, getLowStocks, updateStock, bulkUploadStocks, manualAlert, addStock, updateRequestStatus };
