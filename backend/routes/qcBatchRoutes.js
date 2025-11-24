const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getBatchesBySurvey,
  getBatchById,
  triggerBatchProcessing
} = require('../controllers/qcBatchController');

// All routes require authentication
router.use(protect);

// Get batches for a survey
router.get('/survey/:surveyId', getBatchesBySurvey);

// Get a single batch
router.get('/:batchId', getBatchById);

// Manually trigger batch processing
router.post('/process', triggerBatchProcessing);

module.exports = router;

