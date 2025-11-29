const fs = require('fs');
const path = require('path');

let pollingStationData = null;

/**
 * Load polling station data
 */
const loadData = () => {
  if (pollingStationData) return pollingStationData;
  
  try {
    const dataPath = path.join(__dirname, '../data/polling_stations.json');
    pollingStationData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return pollingStationData;
  } catch (error) {
    console.error('Error loading polling station data:', error);
    return null;
  }
};

/**
 * Find AC number by AC name in a state
 */
const findACNumberByName = (state, acName) => {
  const data = loadData();
  if (!data || !data[state]) return null;
  
  // Normalize the search name (remove extra spaces, convert to lowercase)
  const normalizedSearchName = acName.trim().toLowerCase().replace(/\s+/g, ' ');
  
  for (const [acNo, acData] of Object.entries(data[state])) {
    if (!acData.ac_name) continue;
    
    // Normalize the stored AC name
    const normalizedStoredName = acData.ac_name.trim().toLowerCase().replace(/\s+/g, ' ');
    
    // Exact match
    if (normalizedStoredName === normalizedSearchName) {
      return acNo;
    }
    
    // Partial match - check if stored name contains search name or vice versa
    // This handles cases like "KALCHINI (ST)" matching "Kalchini"
    if (normalizedStoredName.includes(normalizedSearchName) || 
        normalizedSearchName.includes(normalizedStoredName.replace(/\s*\([^)]*\)\s*/g, '').trim())) {
      return acNo;
    }
    
    // Also try removing parentheses content for matching
    const storedWithoutParens = normalizedStoredName.replace(/\s*\([^)]*\)\s*/g, '').trim();
    const searchWithoutParens = normalizedSearchName.replace(/\s*\([^)]*\)\s*/g, '').trim();
    if (storedWithoutParens === searchWithoutParens) {
      return acNo;
    }
  }
  return null;
};

/**
 * Get groups for AC (by name or number)
 */
const getGroupsForAC = (state, acIdentifier) => {
  const data = loadData();
  if (!data || !data[state]) return null;
  
  // Try to find by number first
  if (data[state][acIdentifier]) {
    return data[state][acIdentifier];
  }
  
  // Try to find by name (with improved matching)
  const acNo = findACNumberByName(state, acIdentifier);
  if (acNo && data[state][acNo]) {
    return data[state][acNo];
  }
  
  // Last resort: try direct case-insensitive name matching
  const normalizedSearch = acIdentifier.trim().toLowerCase();
  for (const [acNo, acData] of Object.entries(data[state])) {
    if (acData.ac_name && acData.ac_name.trim().toLowerCase() === normalizedSearch) {
      return acData;
    }
    // Also try without parentheses
    const nameWithoutParens = acData.ac_name?.replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase();
    if (nameWithoutParens === normalizedSearch) {
      return acData;
    }
  }
  
  return null;
};

module.exports = {
  loadData,
  findACNumberByName,
  getGroupsForAC
};

