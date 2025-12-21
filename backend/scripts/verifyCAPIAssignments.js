/**
 * Verify CAPI users are assigned to Project Manager
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const PM_EMAIL = 'abdur.rakib@convergent.com';
const CAPI_MEMBER_IDS = [
  'CAPI408',
  'CAPI431',
  'CAPI432',
  'CAPI438',
  'CAPI440',
  'CAPI488',
  'CAPI498',
  'CAPI499',
  'CAPI581',
  'CAPI582',
  'CAPI583',
  'CAPI588'
];

const verifyAssignments = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/opine';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Find Project Manager
    const pm = await User.findOne({ email: PM_EMAIL.toLowerCase(), userType: 'project_manager' })
      .populate('assignedTeamMembers.user', 'firstName lastName memberId userType');
    
    if (!pm) {
      throw new Error(`Project Manager with email ${PM_EMAIL} not found`);
    }
    
    console.log(`✅ Found Project Manager: ${pm.firstName} ${pm.lastName}`);
    console.log(`   Total assigned team members: ${pm.assignedTeamMembers.length}\n`);

    // Check which CAPI users are assigned
    const assignedCAPI = [];
    const missingCAPI = [];
    
    for (const memberId of CAPI_MEMBER_IDS) {
      const found = pm.assignedTeamMembers.find(m => 
        m.user && m.user.memberId === memberId
      );
      
      if (found) {
        assignedCAPI.push({
          memberId: memberId,
          name: `${found.user.firstName} ${found.user.lastName}`
        });
      } else {
        missingCAPI.push(memberId);
      }
    }

    console.log('📊 Verification Results:');
    console.log('='.repeat(80));
    console.log(`✅ Assigned CAPI users: ${assignedCAPI.length}/${CAPI_MEMBER_IDS.length}`);
    
    if (assignedCAPI.length > 0) {
      console.log('\n✅ Assigned CAPI Users:');
      assignedCAPI.forEach(item => {
        console.log(`   - ${item.memberId}: ${item.name}`);
      });
    }
    
    if (missingCAPI.length > 0) {
      console.log('\n❌ Missing CAPI Users:');
      missingCAPI.forEach(memberId => {
        console.log(`   - ${memberId}`);
      });
    } else {
      console.log('\n✅ All CAPI users are assigned to the Project Manager!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

verifyAssignments();

