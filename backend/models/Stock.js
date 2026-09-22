const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  hospital_id: { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  medicine_name: { type: String, required: true },
  type: { type: String, enum: ['medicine', 'equipment'], default: 'medicine' },
  max_capacity: { type: Number, default: 0 },
  opening_stock: { type: Number, default: 0 },
  issued: { type: Number, default: 0 },
  received: { type: Number, default: 0 },
  closing_stock: { type: Number, default: 0 },
  minimum_threshold: { type: Number, default: 50 },
  status: {
    type: String,
    enum: ['normal', 'low_stock', 'critical'],
    default: 'normal'
  },
  edit_history: [{
    edited_at: { type: Date, default: Date.now },
    previous_count: { type: Number },
    new_count: { type: Number },
    edited_by: { type: String }
  }],
  request_status: {
    type: String,
    enum: ['none', 'requested', 'dispatched', 'received'],
    default: 'none'
  },
  requested_quantity: { type: Number, default: 0 },
  target_date: { type: Date },
  priority: { type: String, enum: ['Normal', 'Urgent'], default: 'Normal' },
  dispatched_quantity: { type: Number, default: 0 },
  estimated_delivery_date: { type: Date },
  remarks: { type: String },
  last_updated: { type: Date, default: Date.now }
});

// Auto-compute status before save
StockSchema.pre('save', function (next) {
  const isBelow25 = this.max_capacity > 0 && this.closing_stock < (this.max_capacity * 0.25);
  const isBelowThreshold = this.closing_stock < this.minimum_threshold;

  if (this.closing_stock <= 0) {
    this.status = 'critical';
  } else if (isBelow25 || isBelowThreshold) {
    this.status = 'low_stock';
  } else {
    this.status = 'normal';
  }
  next();
});

module.exports = mongoose.model('Stock', StockSchema);
