const mongoose = require('mongoose');
const QCBatch = require('../models/QCBatch');
const SurveyResponse = require('../models/SurveyResponse');

// Helper to convert ObjectId strings to ObjectIds
const toObjectId = (id) => {
  if (typeof id === 'string') {
    return new mongoose.Types.ObjectId(id);
  }
  return id;
};

/**
 * Process QC batches - runs daily to:
 * 1. Process batches from previous day (select 40% randomly and send to QC)
 * 2. Check if 40% QC is complete and make decision on remaining 60%
 */
const processQCBatches = async () => {
  try {
    console.log('🔄 Starting QC Batch Processing Job...');
    
    // Get yesterday's date (start and end of day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    
    console.log(`📅 Processing batches for date: ${yesterday.toISOString().split('T')[0]}`);
    
    // Find all batches from yesterday that are still collecting
    const batchesToProcess = await QCBatch.find({
      batchDate: {
        $gte: yesterday,
        $lte: endOfYesterday
      },
      status: 'collecting',
      totalResponses: { $gt: 0 } // Only process batches with responses
    }).populate('survey');
    
    console.log(`📦 Found ${batchesToProcess.length} batches to process`);
    
    for (const batch of batchesToProcess) {
      try {
        console.log(`\n📋 Processing batch ${batch._id} for survey ${batch.survey?._id || 'unknown'}`);
        console.log(`   Total responses: ${batch.totalResponses}`);
        
        // Check if batch has responses
        if (batch.totalResponses === 0) {
          console.log(`   ⚠️  Batch has no responses, skipping...`);
          continue;
        }
        
        // Calculate 40% sample size
        const sampleSize = Math.ceil(batch.totalResponses * 0.4);
        console.log(`   📊 Sample size (40%): ${sampleSize}`);
        
        // Randomly select 40% of responses
        const allResponseIds = batch.responses.map(id => id.toString());
        const shuffled = [...allResponseIds].sort(() => Math.random() - 0.5);
        const sampleResponseIds = shuffled.slice(0, sampleSize);
        const remainingResponseIds = shuffled.slice(sampleSize);
        
        console.log(`   ✅ Selected ${sampleResponseIds.length} responses for QC sample`);
        console.log(`   📝 Remaining responses: ${remainingResponseIds.length}`);
        
        // Update batch with sample and remaining responses
        batch.sampleResponses = sampleResponseIds;
        batch.sampleSize = sampleResponseIds.length;
        batch.remainingResponses = remainingResponseIds;
        batch.remainingSize = remainingResponseIds.length;
        batch.status = 'processing';
        batch.processingStartedAt = new Date();
        
        // Convert string IDs to ObjectIds
        const sampleObjectIds = sampleResponseIds.map(id => toObjectId(id));
        const remainingObjectIds = remainingResponseIds.map(id => toObjectId(id));
        
        // Mark sample responses in SurveyResponse documents
        await SurveyResponse.updateMany(
          { _id: { $in: sampleObjectIds } },
          { 
            $set: { 
              isSampleResponse: true,
              status: 'Pending_Approval' // Ensure they're in Pending_Approval status
            }
          }
        );
        
        // Mark remaining responses (they stay in batch but won't be in QC queue yet)
        await SurveyResponse.updateMany(
          { _id: { $in: remainingObjectIds } },
          { 
            $set: { 
              isSampleResponse: false,
              status: 'Pending_Approval' // Keep as Pending_Approval but they won't show in queue
            }
          }
        );
        
        // Update batch status to qc_in_progress
        batch.status = 'qc_in_progress';
        await batch.save();
        
        console.log(`   ✅ Batch ${batch._id} processed successfully`);
        console.log(`   📊 ${sampleSize} responses sent to QC queue`);
        console.log(`   ⏳ ${remainingResponseIds.length} responses waiting for decision`);
        
      } catch (error) {
        console.error(`   ❌ Error processing batch ${batch._id}:`, error);
        // Continue with next batch
      }
    }
    
    // Now check all batches in 'qc_in_progress' status to see if 40% QC is complete
    console.log('\n🔍 Checking batches for 40% QC completion...');
    
    const batchesInProgress = await QCBatch.find({
      status: 'qc_in_progress',
      'sampleResponses.0': { $exists: true } // Has sample responses
    });
    
    console.log(`📦 Found ${batchesInProgress.length} batches in QC progress`);
    
    for (const batch of batchesInProgress) {
      try {
        // Update QC stats and check if complete
        await batch.updateQCStats();
        
        console.log(`\n📊 Batch ${batch._id} QC Stats:`);
        console.log(`   Approved: ${batch.qcStats.approvedCount}`);
        console.log(`   Rejected: ${batch.qcStats.rejectedCount}`);
        console.log(`   Pending: ${batch.qcStats.pendingCount}`);
        console.log(`   Approval Rate: ${batch.qcStats.approvalRate}%`);
        console.log(`   Status: ${batch.status}`);
        
      } catch (error) {
        console.error(`   ❌ Error updating stats for batch ${batch._id}:`, error);
      }
    }
    
    console.log('\n✅ QC Batch Processing Job completed');
    
  } catch (error) {
    console.error('❌ Error in QC Batch Processing Job:', error);
    throw error;
  }
};

/**
 * Check and process batches (can be called manually or via cron)
 */
const checkAndProcessBatches = async () => {
  // This function can be called periodically to check batches
  // It will process yesterday's batches and check in-progress batches
  await processQCBatches();
};

module.exports = {
  processQCBatches,
  checkAndProcessBatches
};

// If running directly (for testing)
if (require.main === module) {
  const connectDB = require('../config/db');
  
  connectDB()
    .then(() => {
      console.log('✅ Database connected');
      return processQCBatches();
    })
    .then(() => {
      console.log('✅ Job completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Job failed:', error);
      process.exit(1);
    });
}

