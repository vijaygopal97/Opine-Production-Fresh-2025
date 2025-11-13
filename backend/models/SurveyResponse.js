const mongoose = require('mongoose');

const surveyResponseSchema = new mongoose.Schema({
  // Unique Numerical ID for easy reference
  responseId: {
    type: String,
    unique: true,
    required: false, // Changed to false to handle existing documents
    index: true,
    sparse: true // This allows multiple null values
  },
  
  // Survey and Interviewer Information
  survey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Survey',
    required: [true, 'Survey reference is required']
  },
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Interviewer reference is required']
  },
  
  // Response Status
  status: {
    type: String,
    enum: ['Pending_Approval', 'Approved', 'Rejected', 'completed', 'abandoned'],
    required: true,
    default: 'Pending_Approval'
  },
  
  // Interview Session Information
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  totalTimeSpent: {
    type: Number, // in seconds
    required: true
  },
  
  // Complete Response Data - Only saved when interview is finished
  responses: [{
    sectionIndex: {
      type: Number,
      required: true
    },
    questionIndex: {
      type: Number,
      required: true
    },
    questionId: {
      type: String,
      required: true
    },
    questionType: {
      type: String,
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    questionDescription: {
      type: String
    },
    questionOptions: [{
      type: String
    }],
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    responseTime: {
      type: Number, // time taken to answer in seconds
      default: 0
    },
    isRequired: {
      type: Boolean,
      default: false
    },
    isSkipped: {
      type: Boolean,
      default: false
    }
  }],
  
  // Interview Context
  interviewMode: {
    type: String,
    enum: ['capi', 'cati', 'online'],
    required: true
  },
  
  // Assembly Constituency Selection (for surveys with AC assignment)
  selectedAC: {
    type: String,
    trim: true
  },
  
  // Location Information
  location: {
    latitude: {
      type: Number,
      required: false
    },
    longitude: {
      type: Number,
      required: false
    },
    accuracy: {
      type: Number,
      required: false
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String,
    screenResolution: String,
    timezone: String,
    ipAddress: String
  },
  
  // Completion Statistics
  totalQuestions: {
    type: Number,
    required: true
  },
  answeredQuestions: {
    type: Number,
    required: true
  },
  skippedQuestions: {
    type: Number,
    default: 0
  },
  completionPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Quality Metrics
  qualityMetrics: {
    averageResponseTime: Number,
    totalPauses: {
      type: Number,
      default: 0
    },
    totalPauseTime: {
      type: Number,
      default: 0
    },
    backNavigationCount: {
      type: Number,
      default: 0
    },
    dataQualityScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  // Audio Recording Information
  audioRecording: {
    hasAudio: {
      type: Boolean,
      default: false
    },
    audioUrl: {
      type: String,
      default: null
    },
    recordingDuration: {
      type: Number, // in seconds
      default: 0
    },
    format: {
      type: String,
      default: 'webm'
    },
    codec: {
      type: String,
      default: 'opus'
    },
    bitrate: {
      type: Number,
      default: 32000
    },
    fileSize: {
      type: Number, // in bytes
      default: 0
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },

  // Verification Data (for company admin review)
  verificationData: {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    criteria: {
      audioQuality: {
        type: Number,
        min: 1,
        max: 5
      },
      questionAccuracy: {
        type: String,
        enum: ['Yes', 'No']
      },
      dataAccuracy: {
        type: String,
        enum: ['Yes', 'No']
      },
      locationMatch: {
        type: String,
        enum: ['Yes', 'No']
      }
    },
    feedback: {
      type: String,
      default: ''
    },
    audioQuality: {
      type: Number,
      min: 1,
      max: 5
    },
    questionAccuracy: {
      type: String,
      enum: ['Yes', 'No']
    },
    dataAccuracy: {
      type: String,
      enum: ['Yes', 'No']
    },
    locationMatch: {
      type: String,
      enum: ['Yes', 'No']
    }
  },

  // Metadata
  metadata: {
    surveyVersion: String,
    interviewerNotes: String,
    respondentFeedback: String,
    technicalIssues: [String],
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
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

// Indexes for better performance
surveyResponseSchema.index({ survey: 1, interviewer: 1 });
surveyResponseSchema.index({ sessionId: 1 });
surveyResponseSchema.index({ status: 1 });
surveyResponseSchema.index({ responseId: 1 });
surveyResponseSchema.index({ createdAt: -1 });
surveyResponseSchema.index({ survey: 1, status: 1 });

// Pre-save middleware to update timestamps
surveyResponseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Function to generate unique 6-7 digit numerical ID
const generateUniqueResponseId = async function(SurveyResponseModel) {
  let responseId;
  let isUnique = false;
  
  while (!isUnique) {
    // Generate a 6-7 digit number (100000 to 9999999)
    responseId = Math.floor(Math.random() * (9999999 - 100000 + 1)) + 100000;
    responseId = responseId.toString();
    
    // Check if this ID already exists
    const existingResponse = await SurveyResponseModel.findOne({ responseId });
    if (!existingResponse) {
      isUnique = true;
    }
  }
  
  return responseId;
};

// Static method to create a complete survey response
surveyResponseSchema.statics.createCompleteResponse = async function(data) {
  const {
    survey,
    interviewer,
    sessionId,
    startTime,
    endTime,
    responses,
    interviewMode,
    deviceInfo,
    audioRecording,
    qualityMetrics,
    metadata,
    selectedAC,
    location
  } = data;
  
  console.log('createCompleteResponse received audioRecording:', audioRecording); // Debug log
  console.log('Audio file size:', audioRecording?.fileSize, 'bytes'); // Debug file size

  // Calculate statistics
  const totalQuestions = responses.length;
  const answeredQuestions = responses.filter(r => !r.isSkipped && r.response !== null && r.response !== undefined && r.response !== '').length;
  const skippedQuestions = responses.filter(r => r.isSkipped).length;
  const completionPercentage = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  const totalTimeSpent = Math.round((endTime - startTime) / 1000); // Convert to seconds

  // Generate unique response ID
  const responseId = await generateUniqueResponseId(this);

  return new this({
    responseId,
    survey,
    interviewer,
    status: 'Pending_Approval', // Changed from 'completed' to 'Pending_Approval'
    sessionId,
    startTime,
    endTime,
    totalTimeSpent,
    responses,
    interviewMode,
    deviceInfo,
    audioRecording: audioRecording || {},
    selectedAC: selectedAC || null,
    location: location || null,
    totalQuestions,
    answeredQuestions,
    skippedQuestions,
    completionPercentage,
    qualityMetrics,
    metadata
  });
};

// Instance method to get response summary
surveyResponseSchema.methods.getResponseSummary = function() {
  return {
    responseId: this.responseId,
    sessionId: this.sessionId,
    status: this.status,
    totalQuestions: this.totalQuestions,
    answeredQuestions: this.answeredQuestions,
    skippedQuestions: this.skippedQuestions,
    completionPercentage: this.completionPercentage,
    totalTimeSpent: this.totalTimeSpent,
    startTime: this.startTime,
    endTime: this.endTime,
    interviewMode: this.interviewMode
  };
};

// Instance method to get responses by section
surveyResponseSchema.methods.getResponsesBySection = function() {
  const sections = {};
  this.responses.forEach(response => {
    if (!sections[response.sectionIndex]) {
      sections[response.sectionIndex] = [];
    }
    sections[response.sectionIndex].push(response);
  });
  return sections;
};

module.exports = mongoose.model('SurveyResponse', surveyResponseSchema);