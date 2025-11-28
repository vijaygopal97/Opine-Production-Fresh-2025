const QCBatch = require('../models/QCBatch');
const QCBatchConfig = require('../models/QCBatchConfig');
const SurveyResponse = require('../models/SurveyResponse');
const { processPreviousBatch } = require('../jobs/qcBatchProcessor');

/**
 * Get or create a QC batch for a specific survey and date
 * @param {String} surveyId - Survey ID
 * @param {Date} date - Date for the batch (defaults to today)
 * @returns {Promise<QCBatch>}
 */
const getOrCreateBatch = async (surveyId, date = null) => {
  // Use provided date or today's date (start of day)
  const batchDate = date ? new Date(date) : new Date();
  batchDate.setHours(0, 0, 0, 0);
  
  // End of day for query
  const endOfDay = new Date(batchDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Find existing batch for this date
  let batch = await QCBatch.findOne({
    survey: surveyId,
    batchDate: {
      $gte: batchDate,
      $lte: endOfDay
    },
    status: { $in: ['collecting', 'processing', 'qc_in_progress'] }
  });
  
  // If no batch exists, create a new one
  if (!batch) {
    // Get active config for this survey to store in batch
    const Survey = require('../models/Survey');
    const survey = await Survey.findById(surveyId).populate('company');
    let config = null;
    if (survey) {
      config = await QCBatchConfig.getActiveConfig(surveyId, survey.company._id || survey.company);
    }
    
    batch = new QCBatch({
      survey: surveyId,
      batchDate: batchDate,
      status: 'collecting',
      responses: [],
      totalResponses: 0,
      sampleResponses: [],
      sampleSize: 0,
      remainingResponses: [],
      remainingSize: 0,
      qcStats: {
        approvedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
        approvalRate: 0
      },
      remainingDecision: {
        decision: 'pending'
      },
      batchConfig: config ? {
        samplePercentage: config.samplePercentage,
        approvalRules: config.approvalRules || [],
        configId: config._id || null
      } : {
        samplePercentage: 40,
        approvalRules: [
          { minRate: 50, maxRate: 100, action: 'auto_approve', description: '50%+ - Auto approve' },
          { minRate: 0, maxRate: 50, action: 'send_to_qc', description: 'Below 50% - Send to QC' }
        ]
      }
    });
    
    await batch.save();
    console.log(`✅ Created new QC batch for survey ${surveyId} on ${batchDate.toISOString().split('T')[0]}`);
    
    // Trigger processing of previous batch when new batch is created
    // This happens immediately when a new batch is created
    try {
      await processPreviousBatch(surveyId);
      
      // Also check if any batches in progress can have decisions made
      const { checkBatchesInProgress } = require('../jobs/qcBatchProcessor');
      await checkBatchesInProgress();
    } catch (error) {
      console.error('⚠️  Error processing previous batch (non-critical):', error);
      // Don't throw - batch creation should succeed even if previous batch processing fails
    }
  }
  
  return batch;
};

/**
 * Add a response to a batch
 * @param {String} responseId - SurveyResponse ID
 * @param {String} surveyId - Survey ID
 * @returns {Promise<QCBatch>}
 */
const addResponseToBatch = async (responseId, surveyId) => {
  try {
    // Get or create batch for today
    const batch = await getOrCreateBatch(surveyId);
    
    // Add response to batch if not already added
    if (!batch.responses.includes(responseId)) {
      batch.responses.push(responseId);
      batch.totalResponses = batch.responses.length;
      await batch.save();
      
      // Update response with batch reference
      await SurveyResponse.findByIdAndUpdate(responseId, {
        qcBatch: batch._id,
        isSampleResponse: false
      });
      
      console.log(`✅ Added response ${responseId} to batch ${batch._id}`);
    }
    
    return batch;
  } catch (error) {
    console.error('Error adding response to batch:', error);
    throw error;
  }
};

module.exports = {
  getOrCreateBatch,
  addResponseToBatch
};



