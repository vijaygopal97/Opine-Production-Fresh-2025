const mongoose = require('mongoose');

const qcBatchSchema = new mongoose.Schema({
  // Survey reference
  survey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
    required: true,
    index: true
  },
  
  // Batch date (date when responses were collected)
  batchDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Batch status
  status: {
    type: String,
    enum: [
      'collecting',      // Still collecting responses for the day
      'processing',      // 40% selected and sent to QC
      'qc_in_progress',  // 40% being quality checked
      'completed',       // Batch processing completed (all responses approved/rejected)
      'auto_approved',   // Remaining 60% auto-approved (approval rate > 50%)
      'queued_for_qc'    // Remaining 60% sent to QC queue (approval rate <= 50%)
    ],
    default: 'collecting',
    index: true
  },
  
  // All responses in this batch
  responses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SurveyResponse',
    required: true
  }],
  
  // Total number of responses in batch
  totalResponses: {
    type: Number,
    default: 0
  },
  
  // 40% sample responses (randomly selected)
  sampleResponses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SurveyResponse'
  }],
  
  // Number of sample responses (40%)
  sampleSize: {
    type: Number,
    default: 0
  },
  
  // Remaining responses (60%)
  remainingResponses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SurveyResponse'
  }],
  
  // Number of remaining responses
  remainingSize: {
    type: Number,
    default: 0
  },
  
  // QC Statistics for 40% sample
  qcStats: {
    // Number of approved responses in sample
    approvedCount: {
      type: Number,
      default: 0
    },
    // Number of rejected responses in sample
    rejectedCount: {
      type: Number,
      default: 0
    },
    // Number of pending QC responses in sample
    pendingCount: {
      type: Number,
      default: 0
    },
    // Approval rate (approved / (approved + rejected)) * 100
    approvalRate: {
      type: Number,
      default: 0
    },
    // Date when 40% QC was completed
    sampleQCCompletedAt: {
      type: Date
    }
  },
  
  // Decision on remaining 60%
  remainingDecision: {
    // Decision: 'auto_approved' or 'queued_for_qc'
    decision: {
      type: String,
      enum: ['auto_approved', 'queued_for_qc', 'pending']
    },
    // Date when decision was made
    decidedAt: {
      type: Date
    },
    // Approval rate that triggered the decision
    triggerApprovalRate: {
      type: Number
    }
  },
  
  // Processing dates
  processingStartedAt: {
    type: Date
  },
  processingCompletedAt: {
    type: Date
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
qcBatchSchema.index({ survey: 1, batchDate: -1 });
qcBatchSchema.index({ survey: 1, status: 1 });
qcBatchSchema.index({ status: 1, batchDate: -1 });

// Method to calculate and update QC stats
qcBatchSchema.methods.updateQCStats = async function() {
  const SurveyResponse = mongoose.model('SurveyResponse');
  
  // Convert sample response IDs to ObjectIds
  const sampleObjectIds = this.sampleResponses.map(id => {
    if (typeof id === 'string') {
      return new mongoose.Types.ObjectId(id);
    }
    return id;
  });
  
  const stats = await SurveyResponse.aggregate([
    {
      $match: {
        _id: { $in: sampleObjectIds }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  let approvedCount = 0;
  let rejectedCount = 0;
  let pendingCount = 0;
  
  stats.forEach(stat => {
    if (stat._id === 'Approved') {
      approvedCount = stat.count;
    } else if (stat._id === 'Rejected') {
      rejectedCount = stat.count;
    } else if (stat._id === 'Pending_Approval') {
      pendingCount = stat.count;
    }
  });
  
  // Calculate approval rate (only from completed QC)
  const totalQCed = approvedCount + rejectedCount;
  const approvalRate = totalQCed > 0 ? (approvedCount / totalQCed) * 100 : 0;
  
  this.qcStats = {
    approvedCount,
    rejectedCount,
    pendingCount,
    approvalRate: Math.round(approvalRate * 100) / 100, // Round to 2 decimal places
    sampleQCCompletedAt: pendingCount === 0 && totalQCed > 0 ? new Date() : this.qcStats?.sampleQCCompletedAt
  };
  
  // Check if 40% QC is complete
  if (pendingCount === 0 && totalQCed > 0) {
    // All sample responses have been QCed
    // Make decision on remaining 60%
    if (approvalRate > 50) {
      // Auto-approve remaining 60%
      this.status = 'auto_approved';
      this.remainingDecision = {
        decision: 'auto_approved',
        decidedAt: new Date(),
        triggerApprovalRate: approvalRate
      };
      
      // Convert remaining response IDs to ObjectIds
      const remainingObjectIds = this.remainingResponses.map(id => {
        if (typeof id === 'string') {
          return new mongoose.Types.ObjectId(id);
        }
        return id;
      });
      
      // Auto-approve all remaining responses
      await SurveyResponse.updateMany(
        { _id: { $in: remainingObjectIds } },
        { 
          $set: { 
            status: 'Approved',
            verificationData: {
              reviewer: null,
              reviewedAt: new Date(),
              criteria: {},
              feedback: 'Auto-approved based on 40% sample approval rate',
              autoApproved: true,
              batchId: this._id
            }
          }
        }
      );
    } else {
      // Send remaining 60% to QC queue
      this.status = 'queued_for_qc';
      this.remainingDecision = {
        decision: 'queued_for_qc',
        decidedAt: new Date(),
        triggerApprovalRate: approvalRate
      };
      
      // Convert remaining response IDs to ObjectIds
      const remainingObjectIds = this.remainingResponses.map(id => {
        if (typeof id === 'string') {
          return new mongoose.Types.ObjectId(id);
        }
        return id;
      });
      
      // Update remaining responses to Pending_Approval (they're already in that status, but ensure it)
      await SurveyResponse.updateMany(
        { _id: { $in: remainingObjectIds } },
        { 
          $set: { 
            status: 'Pending_Approval'
          }
        }
      );
    }
    
    this.processingCompletedAt = new Date();
  }
  
  await this.save();
  return this;
};

module.exports = mongoose.model('QCBatch', qcBatchSchema);

