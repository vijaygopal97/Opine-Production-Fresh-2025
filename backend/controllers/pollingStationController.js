const { loadData, findACNumberByName, getGroupsForAC } = require('../utils/pollingStationHelper');

/**
 * @desc    Get available round numbers for a specific AC
 * @route   GET /api/polling-stations/rounds/:state/:acIdentifier
 * @access  Private
 */
const getRoundNumbersByAC = async (req, res) => {
  try {
    const { state, acIdentifier } = req.params;
    const decodedACIdentifier = decodeURIComponent(acIdentifier);
    console.log('getRoundNumbersByAC - State:', state, 'AC Identifier (decoded):', decodedACIdentifier);
    
    const acData = getGroupsForAC(state, decodedACIdentifier);
    
    if (!acData) {
      console.log('AC not found - State:', state, 'AC Identifier:', decodedACIdentifier);
      return res.status(404).json({
        success: false,
        message: 'AC not found in polling station data'
      });
    }
    
    // Collect unique round numbers from all groups
    const roundNumbers = new Set();
    for (const groupName in acData.groups || {}) {
      const stations = acData.groups[groupName].polling_stations || [];
      for (const station of stations) {
        if (station.Interview_Round_number) {
          roundNumbers.add(station.Interview_Round_number);
        }
      }
    }
    
    const rounds = Array.from(roundNumbers).sort((a, b) => parseInt(a) - parseInt(b));
    console.log('Found round numbers:', rounds);
    
    res.json({
      success: true,
      data: {
        rounds: rounds
      }
    });
  } catch (error) {
    console.error('Error fetching round numbers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch round numbers',
      error: error.message
    });
  }
};

/**
 * @desc    Get groups for a specific AC (accepts AC number or AC name)
 * @route   GET /api/polling-stations/groups/:state/:acIdentifier
 * @access  Private
 */
const getGroupsByAC = async (req, res) => {
  try {
    const { state, acIdentifier } = req.params;
    const { roundNumber } = req.query; // Optional round number filter
    const decodedACIdentifier = decodeURIComponent(acIdentifier);
    console.log('getGroupsByAC - State:', state, 'AC Identifier (decoded):', decodedACIdentifier, 'Round Number:', roundNumber);
    
    const acData = getGroupsForAC(state, decodedACIdentifier);
    
    if (!acData) {
      console.log('AC not found - State:', state, 'AC Identifier:', decodedACIdentifier);
      return res.status(404).json({
        success: false,
        message: 'AC not found in polling station data'
      });
    }
    
    // Filter groups by round number if provided
    let groups = Object.keys(acData.groups || {});
    if (roundNumber) {
      groups = groups.filter(groupName => {
        const stations = acData.groups[groupName].polling_stations || [];
        return stations.some(station => station.Interview_Round_number === roundNumber);
      });
    }
    
    console.log('Found AC:', acData.ac_name, 'Groups count:', groups.length, 'Group names:', groups);
    
    res.json({
      success: true,
      data: {
        ac_name: acData.ac_name,
        ac_no: findACNumberByName(state, acData.ac_name) || acIdentifier,
        pc_no: acData.pc_no || null,
        pc_name: acData.pc_name || null,
        district: acData.district || null,
        district_code: acData.district_code || null,
        region_code: acData.region_code || null,
        region_name: acData.region_name || null,
        groups: groups.map(groupName => {
          const stations = acData.groups[groupName].polling_stations || [];
          // Filter stations by round number if provided
          const filteredStations = roundNumber 
            ? stations.filter(s => s.Interview_Round_number === roundNumber)
            : stations;
          return {
            name: groupName,
            polling_station_count: filteredStations.length
          };
        }).filter(group => group.polling_station_count > 0) // Only return groups with stations
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
    const { roundNumber } = req.query; // Optional round number filter
    const decodedACIdentifier = decodeURIComponent(acIdentifier);
    const decodedGroupName = decodeURIComponent(groupName);
    console.log('getPollingStationsByGroup - State:', state, 'AC (decoded):', decodedACIdentifier, 'Group (decoded):', decodedGroupName, 'Round Number:', roundNumber);
    
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
    
    let stations = acData.groups[decodedGroupName].polling_stations || [];
    
    // Filter by round number if provided
    if (roundNumber) {
      stations = stations.filter(station => station.Interview_Round_number === roundNumber);
    }
    
    console.log('Found', stations.length, 'polling stations for group:', decodedGroupName, 'Round:', roundNumber || 'All');
    
    res.json({
      success: true,
      data: {
        stations: stations.map(station => ({
          name: station.name,
          gps_location: station.gps_location,
          latitude: station.latitude,
          longitude: station.longitude,
          Interview_Round_number: station.Interview_Round_number || null
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
  getRoundNumbersByAC,
  getGroupsByAC,
  getPollingStationsByGroup,
  getPollingStationGPS
};

