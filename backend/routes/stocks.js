const express = require('express');
const router = express.Router();
const { getStocks, getLowStocks, updateStock, bulkUploadStocks, manualAlert, addStock, updateRequestStatus } = require('../controllers/stockController');
const { protect } = require('../middleware/auth');
const { districtFilter } = require('../middleware/districtFilter');

router.use(protect, districtFilter);

// Stock routes
router.get('/', getStocks);
router.post('/', addStock);
router.get('/low', getLowStocks);
router.put('/:id', updateStock);
router.post('/bulk', bulkUploadStocks);
router.post('/alert', manualAlert);
router.post('/:id/request-status', updateRequestStatus);

module.exports = router;
