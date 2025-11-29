const { loadData, findACNumberByName, getGroupsForAC } = require('../utils/pollingStationHelper');

/**
 * @desc    Get groups for a specific AC (accepts AC number or AC name)
 * @route   GET /api/polling-stations/groups/:state/:acIdentifier
 * @access  Private
 */
const getGroupsByAC = async (req, res) => {
  try {
    const { state, acIdentifier } = req.params;
    const decodedACIdentifier = decodeURIComponent(acIdentifier);
    console.log('getGroupsByAC - State:', state, 'AC Identifier (decoded):', decodedACIdentifier);
    
    const acData = getGroupsForAC(state, decodedACIdentifier);
    
    if (!acData) {
      console.log('AC not found - State:', state, 'AC Identifier:', decodedACIdentifier);
      return res.status(404).json({
        success: false,
        message: 'AC not found in polling station data'
      });
    }
    
    const groups = Object.keys(acData.groups || {});
    console.log('Found AC:', acData.ac_name, 'Groups count:', groups.length, 'Group names:', groups);
    
    res.json({
      success: true,
      data: {
        ac_name: acData.ac_name,
        ac_no: findACNumberByName(state, acData.ac_name) || acIdentifier,
        pc_no: acData.pc_no || null,
        pc_name: acData.pc_name || null,
        district: acData.district || null,
        groups: groups.map(groupName => ({
          name: groupName,
          polling_station_count: acData.groups[groupName].polling_stations.length
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch groups',
      error: error.message
    });
  }
};

/**
 * @desc    Get polling stations for a specific group (accepts AC number or AC name)
 * @route   GET /api/polling-stations/stations/:state/:acIdentifier/:groupName
 * @access  Private
 */
const getPollingStationsByGroup = async (req, res) => {
  try {
    const { state, acIdentifier, groupName } = req.params;
    const decodedACIdentifier = decodeURIComponent(acIdentifier);
    const decodedGroupName = decodeURIComponent(groupName);
    console.log('getPollingStationsByGroup - State:', state, 'AC (decoded):', decodedACIdentifier, 'Group (decoded):', decodedGroupName);
    
    const acData = getGroupsForAC(state, decodedACIdentifier);
    
    if (!acData) {
      console.log('AC not found for polling stations - State:', state, 'AC:', decodedACIdentifier);
      return res.status(404).json({
        success: false,
        message: 'AC not found in polling station data'
      });
    }
    
    if (!acData.groups[decodedGroupName]) {
      console.log('Group not found - Available groups:', Object.keys(acData.groups), 'Requested:', decodedGroupName);
      return res.status(404).json({
        success: false,
        message: 'Group not found in polling station data'
      });
    }
    
    const stations = acData.groups[decodedGroupName].polling_stations;
    console.log('Found', stations.length, 'polling stations for group:', decodedGroupName);
    
    res.json({
      success: true,
      data: {
        stations: stations.map(station => ({
          name: station.name,
          gps_location: station.gps_location,
          latitude: station.latitude,
          longitude: station.longitude
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching polling stations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch polling stations',
      error: error.message
    });
  }
};

/**
 * @desc    Get polling station GPS location by name (accepts AC number or AC name)
 * @route   GET /api/polling-stations/gps/:state/:acIdentifier/:groupName/:stationName
 * @access  Private
 */
const getPollingStationGPS = async (req, res) => {
  try {
    const { state, acIdentifier, groupName, stationName } = req.params;
    const acData = getGroupsForAC(state, acIdentifier);
    
    if (!acData || !acData.groups[groupName]) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const stations = acData.groups[groupName].polling_stations;
    const station = stations.find(s => s.name === decodeURIComponent(stationName));
    
    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Polling station not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        name: station.name,
        gps_location: station.gps_location,
        latitude: station.latitude,
        longitude: station.longitude
      }
    });
  } catch (error) {
    console.error('Error fetching polling station GPS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch polling station GPS',
      error: error.message
    });
  }
};

module.exports = {
  getGroupsByAC,
  getPollingStationsByGroup,
  getPollingStationGPS
};

