const express = require('express');
const router = express.Router();
const { 
  getInterviewerProfileById,
  getInterviewerProfile, 
  updateInterviewerProfile, 
  submitProfileForApproval, 
  getPendingProfiles, 
  reviewProfile,
  getIndependentInterviewerProfiles,
  reviewIndependentInterviewerProfile
} = require('../controllers/interviewerProfileController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get interviewer profile by ID (for company admins)
router.get('/profile/:userId', protect, getInterviewerProfileById);

// Get interviewer profile
router.get('/profile', protect, getInterviewerProfile);

// Update interviewer profile
router.put('/profile', protect, updateInterviewerProfile);

// Submit profile for approval
router.post('/profile/submit', protect, submitProfileForApproval);

// Get pending profiles for company admin
router.get('/pending-profiles', protect, getPendingProfiles);

// Super admin routes for independent interviewers (must come before general review route)
// Get pending profiles for super admin (independent interviewers)
router.get('/independent/pending-profiles', protect, getIndependentInterviewerProfiles);

// Review independent interviewer profile (super admin only)
router.post('/independent/review-profile/:userId', protect, reviewIndependentInterviewerProfile);

// Review profile (approve/reject) - company admin only
router.post('/review-profile', protect, reviewProfile);

// Upload documents
router.post('/upload-documents', protect, upload.fields([
  { name: 'cvUpload', maxCount: 1 },
  { name: 'aadhaarDocument', maxCount: 1 },
  { name: 'panDocument', maxCount: 1 },
  { name: 'passportPhoto', maxCount: 1 },
  { name: 'bankDocumentUpload', maxCount: 1 }
]), async (req, res) => {
  try {
    const uploadedFiles = {};
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        uploadedFiles[key] = req.files[key][0].filename;
      });
    }

    // Update the user's profile with the uploaded files and check for verification changes
    const User = require('../models/User');
    const userId = req.user._id;
    
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentProfile = currentUser.interviewerProfile || {};
    
    // Check if verification fields have been changed
    const verificationFields = ['aadhaarDocument', 'panDocument', 'passportPhoto'];
    const verificationChanged = verificationFields.some(field => 
      uploadedFiles[field] && uploadedFiles[field] !== currentProfile[field]
    );

    console.log('🔍 File upload verification change detection:');
    console.log('Current approval status:', currentProfile.approvalStatus);
    console.log('Uploaded files:', uploadedFiles);
    console.log('Verification changed:', verificationChanged);

    // Prepare update data
    const updateData = { ...uploadedFiles };
    
    // If verification fields changed and profile was approved, set status to unverified
    if (verificationChanged && currentProfile.approvalStatus === 'approved') {
      console.log('🔄 Setting status to unverified due to verification file changes');
      updateData.approvalStatus = 'unverified';
      updateData.approvalFeedback = ''; // Clear previous feedback
    }

    // Merge the update data with existing interviewerProfile
    const mergedProfile = { ...currentProfile, ...updateData };

    // Update the user's profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { interviewerProfile: mergedProfile } },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: uploadedFiles,
      updatedProfile: updatedUser.interviewerProfile
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;

