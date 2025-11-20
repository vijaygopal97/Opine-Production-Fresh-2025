const express = require('express');
const router = express.Router();
const {
  makeCall,
  receiveWebhook,
  getCalls,
  getCallById,
  getCallStats,
  checkCallStatus
} = require('../controllers/catiController');
const { protect, authorize } = require('../middleware/auth');

// Webhook endpoint (public, no authentication required)
// GET handler for testing/verification
router.get('/webhook', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Webhook endpoint is active and ready to receive POST requests',
    endpoint: '/api/cati/webhook',
    method: 'POST',
    note: 'This endpoint accepts POST requests from DeepCall webhook service'
  });
});

// POST handler for actual webhook data
router.post('/webhook', receiveWebhook);

// All other routes require authentication
router.use(protect);

// All routes require company_admin role
router.use(authorize('company_admin'));

// Make a call
router.post('/make-call', makeCall);

// Get all calls
router.get('/calls', getCalls);

// Get call statistics
router.get('/stats', getCallStats);

// Get single call by ID
router.get('/calls/:id', getCallById);

// Manually check call status
router.post('/calls/:id/check-status', checkCallStatus);

module.exports = router;

