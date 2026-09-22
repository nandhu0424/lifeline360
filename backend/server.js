require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { startAlertScheduler } = require('./utils/alertScheduler');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development and device push
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/programs', require('./routes/programs'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/phc', require('./routes/phc'));
app.use('/api/work', require('./routes/work'));
app.use('/api/grievances', require('./routes/grievances'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/superadmin', require('./routes/superadmin'));

// Static files and direct page routing
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'Lifeline360 API' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Lifeline360 Backend running on http://localhost:${PORT}`);
  // Start alert scheduler after server starts
  startAlertScheduler();
});

module.exports = app;
