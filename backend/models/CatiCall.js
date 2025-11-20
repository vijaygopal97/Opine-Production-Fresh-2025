const mongoose = require('mongoose');

const catiCallSchema = new mongoose.Schema({
  // Call Identification
  callId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Company/User Information
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Call Details from API Request
  fromNumber: {
    type: String,
    required: true
  },
  toNumber: {
    type: String,
    required: true
  },
  fromType: {
    type: String,
    enum: ['Number', 'Agent', 'Group'],
    default: 'Number'
  },
  toType: {
    type: String,
    enum: ['Number', 'Agent', 'Group'],
    default: 'Number'
  },
  
  // API Response
  apiResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  apiStatus: {
    type: String,
    enum: ['initiated', 'success', 'failed'],
    default: 'initiated'
  },
  apiErrorMessage: {
    type: String
  },
  
  // Webhook Data (Complete call details)
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  webhookReceived: {
    type: Boolean,
    default: false
  },
  webhookReceivedAt: {
    type: Date
  },
  
  // Call Status from Webhook
  callStatus: {
    type: String,
    enum: ['initiated', 'ringing', 'answered', 'completed', 'busy', 'no-answer', 'failed', 'cancelled'],
    default: 'initiated'
  },
  
  // Call Duration and Timing
  callStartTime: {
    type: Date
  },
  callEndTime: {
    type: Date
  },
  callDuration: {
    type: Number, // in seconds
    default: 0
  },
  ringDuration: {
    type: Number, // in seconds
    default: 0
  },
  talkDuration: {
    type: Number, // in seconds
    default: 0
  },
  custAnswerDuration: {
    type: Number, // in seconds
    default: 0
  },
  ivrDuration: {
    type: Number, // in seconds
    default: 0
  },
  agentOnCallDuration: {
    type: Number, // in seconds
    default: 0
  },
  
  // Call Recording
  recordingUrl: {
    type: String
  },
  recordingDuration: {
    type: Number // in seconds
  },
  recordingFileSize: {
    type: Number // in bytes
  },
  
  // Call Quality Metrics
  callQuality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'unknown']
  },
  audioQuality: {
    type: Number, // 1-5 rating
    min: 1,
    max: 5
  },
  
  // Additional Webhook Fields
  hangupCause: {
    type: String
  },
  hangupReason: {
    type: String
  },
  hangupBySource: {
    type: String
  },
  callerId: {
    type: String
  },
  dialedNumber: {
    type: String
  },
  
  // DeepCall Specific Fields
  ctc: {
    type: String
  },
  did: {
    type: String
  },
  callType: {
    type: String
  },
  campaignId: {
    type: String
  },
  deepCallUserId: {
    type: String
  },
  masterAgent: {
    type: String
  },
  masterAgentNumber: {
    type: String
  },
  callDisposition: {
    type: String
  },
  contactId: {
    type: String
  },
  dtmf: {
    type: String
  },
  voiceMail: {
    type: String
  },
  
  // Cost Information (if available)
  callCost: {
    type: Number
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Error Information
  errorCode: {
    type: String
  },
  errorMessage: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
catiCallSchema.index({ company: 1, createdAt: -1 });
catiCallSchema.index({ createdBy: 1, createdAt: -1 });
catiCallSchema.index({ callStatus: 1 });
catiCallSchema.index({ webhookReceived: 1 });

module.exports = mongoose.model('CatiCall', catiCallSchema);

