const express = require('express');
const router = express.Router();
const {
  createSurvey,
  getSurveys,
  getSurvey,
  updateSurvey,
  deleteSurvey,
  publishSurvey,
  assignInterviewers,
  assignQualityAgents,
  getSurveyStats,
  getAvailableSurveys,
  rejectInterview,
  debugSurveyResponses
} = require('../controllers/surveyController');
const { protect, authorize } = require('../middleware/auth');

// Survey routes
router.route('/')
  .post(protect, authorize('company_admin', 'project_manager'), createSurvey)
  .get(protect, authorize('company_admin', 'project_manager', 'interviewer'), getSurveys);

router.route('/stats')
  .get(protect, authorize('company_admin', 'project_manager'), getSurveyStats);

// Interviewer-specific routes (must come before /:id routes)
router.route('/available')
  .get(protect, authorize('interviewer'), getAvailableSurveys);

// Specific routes must come before /:id routes
router.route('/:id/assign-interviewers')
  .post(protect, authorize('company_admin', 'project_manager'), assignInterviewers);

router.route('/:id/assign-quality-agents')
  .post(protect, authorize('company_admin', 'project_manager'), assignQualityAgents);

router.route('/:id/publish')
  .post(protect, authorize('company_admin', 'project_manager'), publishSurvey);

// Specific routes must come before /:id routes
router.route('/:id/reject-interview')
  .post(protect, authorize('interviewer'), rejectInterview);

// Debug route
router.route('/:surveyId/debug-responses')
  .get(protect, authorize('company_admin', 'project_manager'), debugSurveyResponses);

router.route('/:id')
  .get(protect, authorize('company_admin', 'project_manager', 'interviewer'), getSurvey)
  .put(protect, authorize('company_admin', 'project_manager'), updateSurvey)
  .delete(protect, authorize('company_admin', 'project_manager'), deleteSurvey);

module.exports = router;









