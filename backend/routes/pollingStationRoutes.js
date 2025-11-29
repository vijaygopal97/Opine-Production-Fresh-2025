const express = require('express');
const router = express.Router();
const {
  getGroupsByAC,
  getPollingStationsByGroup,
  getPollingStationGPS
} = require('../controllers/pollingStationController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/groups/:state/:acIdentifier', getGroupsByAC);
router.get('/stations/:state/:acIdentifier/:groupName', getPollingStationsByGroup);
router.get('/gps/:state/:acIdentifier/:groupName/:stationName', getPollingStationGPS);

module.exports = router;

