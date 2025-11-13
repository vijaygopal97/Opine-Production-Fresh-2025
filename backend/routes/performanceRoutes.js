const express = require('express');
const router = express.Router();
const {
  getInterviewerPerformance,
  getPerformanceTrends,
  getInterviewHistory
} = require('../controllers/performanceController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected and require interviewer or company_admin role
router.use(protect);
router.use(authorize('interviewer', 'company_admin'));

// @route   GET /api/performance/analytics
// @desc    Get comprehensive performance analytics for interviewer
// @access  Private (Interviewer)
router.get('/analytics', getInterviewerPerformance);

// @route   GET /api/performance/trends
// @desc    Get performance trends over time
// @access  Private (Interviewer)
router.get('/trends', getPerformanceTrends);

// @route   GET /api/performance/interviews
// @desc    Get detailed interview history with pagination and filters
// @access  Private (Interviewer)
router.get('/interviews', getInterviewHistory);

module.exports = router;
