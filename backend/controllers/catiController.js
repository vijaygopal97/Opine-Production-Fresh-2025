const axios = require('axios');
const fs = require('fs');
const path = require('path');
const CatiCall = require('../models/CatiCall');

// DeepCall API Configuration
const DEEPCALL_API_BASE_URL = 'https://s-ct3.sarv.com/v2/clickToCall/para';
const DEEPCALL_USER_ID = process.env.DEEPCALL_USER_ID || '89130240';
const DEEPCALL_TOKEN = process.env.DEEPCALL_TOKEN || '6GQJuwW6lB8ZBHntzaRU';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'https://opine.exypnossolutions.com';

// @desc    Make a CATI call
// @route   POST /api/cati/make-call
// @access  Private (Company Admin only)
const makeCall = async (req, res) => {
  try {
    const { fromNumber, toNumber, fromType, toType, fromRingTime, toRingTime, timeLimit } = req.body;
    const userId = req.user._id;
    const companyId = req.user.company;

    // Validate required fields
    if (!fromNumber || !toNumber) {
      return res.status(400).json({
        success: false,
        message: 'From number and To number are required'
      });
    }

    // Validate phone numbers (basic validation)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(fromNumber.replace(/[^0-9]/g, '')) || !phoneRegex.test(toNumber.replace(/[^0-9]/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please provide 10-digit numbers.'
      });
    }

    // Clean phone numbers (remove all non-digits)
    const cleanFrom = fromNumber.replace(/[^0-9]/g, '');
    const cleanTo = toNumber.replace(/[^0-9]/g, '');

    // Build API request parameters (exactly as DeepCall API expects)
    const params = {
      user_id: DEEPCALL_USER_ID,
      token: DEEPCALL_TOKEN,
      from: cleanFrom,
      to: cleanTo
    };

    // Add optional parameters only if provided
    if (fromType && fromType !== 'Number') params.fromType = fromType;
    if (toType && toType !== 'Number') params.toType = toType;
    if (fromRingTime) params.fromRingTime = parseInt(fromRingTime);
    if (toRingTime) params.toRingTime = parseInt(toRingTime);
    if (timeLimit) params.timeLimit = parseInt(timeLimit);

    // Note: Webhook should be configured in DeepCall dashboard
    // But we can also pass it as a parameter if the API supports it
    // The webhook URL format should match what's configured in DeepCall dashboard
    const webhookUrl = `${WEBHOOK_BASE_URL}/api/cati/webhook`;
    // Only add webhook parameter if API supports it (check DeepCall docs)
    // params.webhook = webhookUrl;

    console.log(`📞 Making CATI call: ${fromNumber} -> ${toNumber}`);
    console.log(`📡 Webhook URL: ${webhookUrl}`);
    console.log(`📋 API Parameters:`, JSON.stringify(params, null, 2));

    // Build the full URL with query parameters (as DeepCall API expects)
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${DEEPCALL_API_BASE_URL}?${queryString}`;
    console.log(`🔗 Full API URL: ${fullUrl}`);

    // Make API call to DeepCall - Use GET method as it works in browser
    let apiResponse;
    try {
      const response = await axios.get(fullUrl, {
        timeout: 30000, // 30 seconds timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      apiResponse = response.data;
      console.log(`✅ API Response Status: ${response.status}`);
      console.log(`✅ API Response Data:`, JSON.stringify(apiResponse, null, 2));
      
      // Check if the response indicates success
      if (response.status === 200 && apiResponse) {
        console.log(`✅ Call initiated successfully`);
      }
    } catch (error) {
      console.error('❌ DeepCall API Error Details:');
      console.error('   Status:', error.response?.status);
      console.error('   Status Text:', error.response?.statusText);
      console.error('   Response Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('   Error Message:', error.message);
      
      // Create call record with error
      const callRecord = new CatiCall({
        callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        company: companyId,
        createdBy: userId,
        fromNumber: fromNumber.replace(/[^0-9]/g, ''),
        toNumber: toNumber.replace(/[^0-9]/g, ''),
        fromType: fromType || 'Number',
        toType: toType || 'Number',
        apiStatus: 'failed',
        apiResponse: error.response?.data || { error: error.message },
        apiErrorMessage: error.response?.data?.message || error.message,
        callStatus: 'failed',
        errorCode: error.response?.status?.toString() || '500',
        errorMessage: error.response?.data?.message || error.message
      });
      await callRecord.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to initiate call',
        error: error.response?.data || error.message,
        callId: callRecord.callId
      });
    }

    // Extract call ID from API response
    // DeepCall API returns: {"callId":"...","status":"success","code":"200"}
    const callId = apiResponse?.callId || 
                   apiResponse?.id || 
                   apiResponse?.call_id ||
                   apiResponse?.data?.callId;
    
    if (!callId) {
      console.error('⚠️  API response does not contain callId:', JSON.stringify(apiResponse, null, 2));
      return res.status(500).json({
        success: false,
        message: 'API response does not contain call ID',
        apiResponse: apiResponse
      });
    }
    
    console.log(`✅ Extracted Call ID from API: ${callId}`);

    // Determine API status based on response
    let apiStatus = 'initiated';
    if (apiResponse?.status === 'success' || apiResponse?.success === true || apiResponse?.code === '200') {
      apiStatus = 'success';
      console.log(`✅ DeepCall API returned success. Call ID: ${callId}`);
    } else if (apiResponse?.status === 'error' || apiResponse?.error || apiResponse?.code !== '200') {
      apiStatus = 'failed';
      console.log(`⚠️  DeepCall API returned error or non-success code`);
    }

    // Create call record in database
    const callRecord = new CatiCall({
      callId: callId,
      company: companyId,
      createdBy: userId,
      fromNumber: fromNumber.replace(/[^0-9]/g, ''),
      toNumber: toNumber.replace(/[^0-9]/g, ''),
      fromType: fromType || 'Number',
      toType: toType || 'Number',
      apiResponse: apiResponse,
      apiStatus: apiStatus,
      callStatus: 'initiated',
      metadata: {
        fromRingTime: fromRingTime || 30,
        toRingTime: toRingTime || 30,
        timeLimit: timeLimit || null,
        webhookUrl: webhookUrl
      }
    });
    await callRecord.save();

    console.log(`✅ Call record created. Call ID: ${callId}`);
    console.log(`📝 Database record ID: ${callRecord._id}`);

    res.json({
      success: true,
      message: 'Call initiated successfully. The call should connect shortly.',
      callId: callId,
      data: {
        callId: callId,
        fromNumber: fromNumber,
        toNumber: toNumber,
        status: 'initiated',
        apiResponse: apiResponse,
        webhookUrl: webhookUrl
      }
    });

  } catch (error) {
    console.error('Error making CATI call:', error);
    res.status(500).json({
      success: false,
      message: 'Error making call',
      error: error.message
    });
  }
};

// @desc    Receive webhook from DeepCall
// @route   POST /api/cati/webhook
// @access  Public (Webhook endpoint)
const receiveWebhook = async (req, res) => {
  const logDir = path.join(__dirname, '../logs');
  const logFile = path.join(logDir, 'webhook-requests.log');
  const timestamp = new Date().toISOString();
  
  try {
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Prepare log entry
    const logEntry = {
      timestamp: timestamp,
      ip: req.ip || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      contentType: req.headers['content-type'] || 'unknown',
      headers: req.headers,
      body: req.body,
      query: req.query,
      method: req.method,
      url: req.url
    };

    // Write to log file (append mode)
    const logLine = `\n${'='.repeat(80)}\n[${timestamp}] WEBHOOK REQUEST RECEIVED\n${'='.repeat(80)}\n${JSON.stringify(logEntry, null, 2)}\n${'='.repeat(80)}\n`;
    fs.appendFileSync(logFile, logLine, 'utf8');

    // Log raw request for debugging (console)
    console.log('📥 ========== WEBHOOK RECEIVED ==========');
    console.log('📥 Timestamp:', timestamp);
    console.log('📥 IP:', logEntry.ip);
    console.log('📥 User-Agent:', logEntry.userAgent);
    console.log('📥 Content-Type:', logEntry.contentType);
    console.log('📥 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📥 Body:', JSON.stringify(req.body, null, 2));
    console.log('📥 Query:', JSON.stringify(req.query, null, 2));
    console.log('📥 ======================================');

    // DeepCall may send data in body, query, or both
    // Handle URL-encoded form data (DeepCall sends as application/x-www-form-urlencoded)
    let webhookData = req.body || req.query || {};
    
    // If body contains push_report (DeepCall format), parse it
    if (webhookData.push_report && typeof webhookData.push_report === 'string') {
      try {
        const parsedReport = JSON.parse(webhookData.push_report);
        
        // Check if push_report is empty
        if (Object.keys(parsedReport).length === 0) {
          console.warn('⚠️  WARNING: push_report is EMPTY! This usually means:');
          console.warn('   1. Webhook template in DeepCall dashboard is not configured correctly');
          console.warn('   2. The call has not completed yet (webhook sent before call ends)');
          console.warn('   3. The template variables are not being populated');
          console.warn('   Please check your DeepCall webhook template configuration.');
          console.warn('   Raw push_report value:', webhookData.push_report);
        } else {
          console.log('📋 Parsed push_report from DeepCall:', JSON.stringify(parsedReport, null, 2));
        }
        
        webhookData = { ...webhookData, ...parsedReport };
      } catch (e) {
        console.log('⚠️  Could not parse push_report:', e.message);
        console.log('   Raw push_report value:', webhookData.push_report);
      }
    } else {
      console.warn('⚠️  No push_report field found in webhook data');
      console.warn('   Available fields in body:', Object.keys(req.body || {}));
      console.warn('   Available fields in query:', Object.keys(req.query || {}));
    }
    
    // Check if we have any meaningful data after parsing
    const hasData = Object.keys(webhookData).some(key => 
      key !== 'push_report' && webhookData[key] !== null && webhookData[key] !== undefined && webhookData[key] !== ''
    );
    
    if (!hasData && webhookData.push_report === '{}') {
      console.error('❌ CRITICAL: Webhook received but contains NO call data!');
      console.error('   This indicates the webhook template in DeepCall is not configured properly.');
      console.error('   Please configure the webhook template in DeepCall dashboard with the required fields.');
    }
    
    // Extract call ID from webhook data - try all possible formats
    const callId = webhookData?.callId || 
                   webhookData?.call_id ||
                   webhookData?.id || 
                   webhookData?.call?.id ||
                   webhookData?.call?.callId ||
                   webhookData?.data?.callId ||
                   webhookData?.data?.id;

    console.log(`🔍 Extracted Call ID: ${callId}`);

    // Find the call record by callId first
    let callRecord = null;
    if (callId) {
      callRecord = await CatiCall.findOne({ callId: callId });
      console.log(`🔍 Found by callId: ${callRecord ? 'Yes' : 'No'}`);
    }

    // If not found, try to find by from/to numbers and recent timestamp (last 2 hours)
    if (!callRecord) {
      const fromNum = (webhookData?.from || webhookData?.fromNumber || webhookData?.call?.from)?.toString().replace(/[^0-9]/g, '');
      const toNum = (webhookData?.to || webhookData?.toNumber || webhookData?.call?.to)?.toString().replace(/[^0-9]/g, '');
      
      if (fromNum && toNum) {
        console.log(`🔍 Searching by numbers: ${fromNum} -> ${toNum}`);
        callRecord = await CatiCall.findOne({
          fromNumber: fromNum,
          toNumber: toNum,
          createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
        }).sort({ createdAt: -1 });
        console.log(`🔍 Found by numbers: ${callRecord ? 'Yes' : 'No'}`);
      }
    }

    // If still not found, try to find by callId stored in our database (exact match)
    if (!callRecord && callId) {
      console.log(`🔍 Searching for callId in database: ${callId}`);
      // Try exact match first
      callRecord = await CatiCall.findOne({ callId: callId });
      if (!callRecord) {
        // Try partial match (in case DeepCall sends a different format)
        callRecord = await CatiCall.findOne({ 
          callId: { $regex: callId.substring(0, 10) } 
        }).sort({ createdAt: -1 });
      }
      console.log(`🔍 Found by callId search: ${callRecord ? 'Yes' : 'No'}`);
    }

    // If still not found, try to find the most recent call without webhook data (last 2 hours)
    if (!callRecord) {
      console.log(`🔍 Searching for most recent call without webhook`);
      callRecord = await CatiCall.findOne({
        webhookReceived: { $ne: true },
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
      }).sort({ createdAt: -1 });
      console.log(`🔍 Found recent call: ${callRecord ? 'Yes' : 'No'}`);
    }

    if (!callRecord) {
      console.error(`⚠️  Call record not found. Webhook data:`, JSON.stringify(webhookData, null, 2));
      // Still acknowledge the webhook immediately (DeepCall expects quick response)
      // Return "GODBLESSYOU" as required by DeepCall
      return res.status(200).send('GODBLESSYOU');
    }

    console.log(`✅ Found call record: ${callRecord._id}, Call ID: ${callRecord.callId}`);

    // Update call record with webhook data
    const updateData = {
      webhookData: webhookData,
      webhookReceived: true,
      webhookReceivedAt: new Date(),
      updatedAt: new Date()
    };

    // Extract and update call status - DeepCall uses "callStatus"
    const statusValue = webhookData?.callStatus || 
                       webhookData?.status || 
                       webhookData?.call?.status ||
                       webhookData?.state ||
                       webhookData?.call?.state;
    
    if (statusValue) {
      const statusLower = statusValue.toString().toLowerCase();
      // Map DeepCall status values
      if (statusLower.includes('complete') || statusLower.includes('completed') || statusLower === 'success') {
        updateData.callStatus = 'completed';
      } else if (statusLower.includes('answer') || statusLower.includes('answered')) {
        updateData.callStatus = 'answered';
      } else if (statusLower.includes('ring')) {
        updateData.callStatus = 'ringing';
      } else if (statusLower.includes('busy')) {
        updateData.callStatus = 'busy';
      } else if (statusLower.includes('fail') || statusLower.includes('error')) {
        updateData.callStatus = 'failed';
      } else if (statusLower.includes('cancel')) {
        updateData.callStatus = 'cancelled';
      } else if (statusLower.includes('no-answer') || statusLower.includes('no_answer')) {
        updateData.callStatus = 'no-answer';
      } else {
        updateData.callStatus = statusLower;
      }
      console.log(`📊 Call status updated to: ${updateData.callStatus}`);
    }

    // Extract call timing information - DeepCall format
    // DeepCall uses: firstAnswerTime, lastHangupTime, ivrSTime, ivrETime
    const startTime = webhookData?.firstAnswerTime || 
                      webhookData?.ivrSTime ||
                      webhookData?.custAnswerSTime ||
                      webhookData?.startTime || 
                      webhookData?.callStartTime || 
                      webhookData?.start_time ||
                      webhookData?.call?.startTime ||
                      webhookData?.timestamp;
    if (startTime) {
      // Handle Unix timestamp (seconds) or ISO string
      updateData.callStartTime = startTime.toString().length === 10 || startTime.toString().length === 13
        ? new Date(parseInt(startTime) * (startTime.toString().length === 10 ? 1000 : 1))
        : new Date(startTime);
      console.log(`⏰ Call start time: ${updateData.callStartTime}`);
    }

    const endTime = webhookData?.lastHangupTime ||
                    webhookData?.ivrETime ||
                    webhookData?.custAnswerETime ||
                    webhookData?.endTime || 
                    webhookData?.callEndTime || 
                    webhookData?.end_time ||
                    webhookData?.call?.endTime ||
                    webhookData?.completedAt;
    if (endTime) {
      // Handle Unix timestamp (seconds) or ISO string
      updateData.callEndTime = endTime.toString().length === 10 || endTime.toString().length === 13
        ? new Date(parseInt(endTime) * (endTime.toString().length === 10 ? 1000 : 1))
        : new Date(endTime);
      console.log(`⏰ Call end time: ${updateData.callEndTime}`);
    }

    // Calculate duration if we have start and end times
    if (updateData.callStartTime && updateData.callEndTime) {
      const durationMs = updateData.callEndTime - updateData.callStartTime;
      updateData.callDuration = Math.floor(durationMs / 1000);
      console.log(`⏱️  Calculated duration: ${updateData.callDuration}s`);
    } else {
      // Try to get duration from webhook data - DeepCall uses: talkDuration, custAnswerDuration, ivrDuration
      const duration = webhookData?.talkDuration ||
                       webhookData?.custAnswerDuration ||
                       webhookData?.ivrDuration ||
                       webhookData?.lastFirstDuration ||
                       webhookData?.duration || 
                       webhookData?.callDuration || 
                       webhookData?.call_duration ||
                       webhookData?.totalDuration ||
                       webhookData?.call?.duration;
      if (duration) {
        updateData.callDuration = parseInt(duration) || 0;
        console.log(`⏱️  Duration from webhook: ${updateData.callDuration}s`);
      }
    }

    // DeepCall specific duration fields
    const talkDuration = webhookData?.talkDuration || 
                         webhookData?.talk_duration ||
                         webhookData?.call?.talkDuration ||
                         webhookData?.billableDuration;
    if (talkDuration) {
      updateData.talkDuration = parseInt(talkDuration) || 0;
      console.log(`💬 Talk duration: ${updateData.talkDuration}s`);
    }

    const custAnswerDuration = webhookData?.custAnswerDuration;
    if (custAnswerDuration) {
      updateData.custAnswerDuration = parseInt(custAnswerDuration) || 0;
    }

    const ivrDuration = webhookData?.ivrDuration;
    if (ivrDuration) {
      updateData.ivrDuration = parseInt(ivrDuration) || 0;
    }

    const agentOnCallDuration = webhookData?.agentOnCallDuration;
    if (agentOnCallDuration) {
      updateData.agentOnCallDuration = parseInt(agentOnCallDuration) || 0;
    }

    // Extract recording information - DeepCall uses "recordings" field
    // DeepCall may send recordings as a string URL or JSON string
    let recordingUrl = webhookData?.recordings || 
                      webhookData?.recordingUrl || 
                      webhookData?.recording_url ||
                      webhookData?.recording?.url ||
                      webhookData?.call?.recordingUrl ||
                      webhookData?.audioUrl ||
                      webhookData?.audio_url;
    
    // If recordings is a JSON string, try to parse it
    if (recordingUrl && typeof recordingUrl === 'string' && recordingUrl.startsWith('[')) {
      try {
        const recordingsArray = JSON.parse(recordingUrl);
        if (Array.isArray(recordingsArray) && recordingsArray.length > 0) {
          recordingUrl = recordingsArray[0].url || recordingsArray[0] || recordingUrl;
        }
      } catch (e) {
        // If parsing fails, use as is
      }
    }
    
    if (recordingUrl && recordingUrl !== 'null' && recordingUrl !== '') {
      updateData.recordingUrl = recordingUrl;
      console.log(`🎵 Recording URL: ${recordingUrl}`);
    }

    const recordingDuration = webhookData?.recordingDuration || 
                               webhookData?.recording_duration ||
                               webhookData?.recording?.duration ||
                               webhookData?.call?.recordingDuration ||
                               webhookData?.audioDuration;
    if (recordingDuration) {
      updateData.recordingDuration = parseInt(recordingDuration) || 0;
      console.log(`🎵 Recording duration: ${updateData.recordingDuration}s`);
    }

    const recordingFileSize = webhookData?.recordingFileSize || 
                               webhookData?.recording_file_size ||
                               webhookData?.recording?.fileSize ||
                               webhookData?.call?.recordingFileSize ||
                               webhookData?.audioFileSize;
    if (recordingFileSize) {
      updateData.recordingFileSize = parseInt(recordingFileSize) || 0;
      console.log(`🎵 Recording file size: ${updateData.recordingFileSize} bytes`);
    }

    // Extract phone numbers - DeepCall uses: masterNumCTC (from), cNumber (to)
    if (webhookData?.masterNumCTC) {
      updateData.fromNumber = webhookData.masterNumCTC.toString().replace(/[^0-9]/g, '');
      console.log(`📞 From number: ${updateData.fromNumber}`);
    }
    if (webhookData?.cNumber || webhookData?.cNumber10) {
      updateData.toNumber = (webhookData.cNumber || webhookData.cNumber10).toString().replace(/[^0-9]/g, '');
      console.log(`📞 To number: ${updateData.toNumber}`);
    }

    // Extract hangup information - DeepCall uses: exitCode, HangupBySourceDetected
    if (webhookData?.exitCode) {
      updateData.hangupCause = webhookData.exitCode;
      console.log(`📴 Hangup cause: ${updateData.hangupCause}`);
    }
    if (webhookData?.HangupBySourceDetected) {
      updateData.hangupBySource = webhookData.HangupBySourceDetected;
    }
    if (webhookData?.hangupReason) {
      updateData.hangupReason = webhookData.hangupReason;
    }

    // Extract caller ID information
    if (webhookData?.callerId || webhookData?.caller_id) {
      updateData.callerId = webhookData.callerId || webhookData.caller_id;
    }
    if (webhookData?.dialedNumber || webhookData?.dialed_number) {
      updateData.dialedNumber = webhookData.dialedNumber || webhookData.dialed_number;
    }

    // Extract cost information - DeepCall uses: totalCreditsUsed
    if (webhookData?.totalCreditsUsed) {
      updateData.callCost = parseFloat(webhookData.totalCreditsUsed) || 0;
      console.log(`💰 Credits used: ${updateData.callCost}`);
    } else if (webhookData?.cost || webhookData?.callCost) {
      updateData.callCost = parseFloat(webhookData.cost || webhookData.callCost) || 0;
    }
    if (webhookData?.currency) {
      updateData.currency = webhookData.currency;
    }

    // Extract DeepCall specific fields
    if (webhookData?.CTC) {
      updateData.ctc = webhookData.CTC;
    }
    if (webhookData?.did) {
      updateData.did = webhookData.did;
    }
    if (webhookData?.cType) {
      updateData.callType = webhookData.cType;
    }
    if (webhookData?.campId) {
      updateData.campaignId = webhookData.campId;
    }
    if (webhookData?.userId) {
      updateData.deepCallUserId = webhookData.userId;
    }
    if (webhookData?.masterAgent) {
      updateData.masterAgent = webhookData.masterAgent;
    }
    if (webhookData?.masterAgentNumber) {
      updateData.masterAgentNumber = webhookData.masterAgentNumber;
    }
    if (webhookData?.callDisposition) {
      updateData.callDisposition = webhookData.callDisposition;
    }
    if (webhookData?.contactId) {
      updateData.contactId = webhookData.contactId;
    }
    if (webhookData?.DTMF) {
      updateData.dtmf = webhookData.DTMF;
    }
    if (webhookData?.voiceMail) {
      updateData.voiceMail = webhookData.voiceMail;
    }

    // Extract error information
    if (webhookData?.errorCode) {
      updateData.errorCode = webhookData.errorCode;
    }
    if (webhookData?.errorMessage) {
      updateData.errorMessage = webhookData.errorMessage;
    }

    // Send response immediately to DeepCall (before database update)
    // DeepCall expects a quick 200 OK response with "GODBLESSYOU"
    res.status(200).send('GODBLESSYOU');

    // Update the call record asynchronously (after sending response)
    // This ensures DeepCall gets a quick response
    CatiCall.findByIdAndUpdate(
      callRecord._id, 
      updateData,
      { new: true }
    ).then(updatedCall => {
      console.log(`✅ Webhook processed successfully for call ID: ${callId || callRecord.callId}`);
      console.log(`📊 Updated call status: ${updatedCall.callStatus}`);
      console.log(`⏱️  Updated call duration: ${updatedCall.callDuration}s`);
      console.log(`🎵 Recording URL: ${updatedCall.recordingUrl || 'Not available'}`);
    }).catch(err => {
      console.error('Error updating call record after webhook response:', err);
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    // Always return 200 OK with "GODBLESSYOU" to DeepCall to prevent retries
    // DeepCall expects this specific response
    res.status(200).send('GODBLESSYOU');
  }
};

// @desc    Get all CATI calls for a company
// @route   GET /api/cati/calls
// @access  Private (Company Admin only)
const getCalls = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.company;
    const { page = 1, limit = 20, status, search } = req.query;

    // Build query
    const query = { company: companyId };
    
    if (status && status !== 'all') {
      query.callStatus = status;
    }
    
    if (search) {
      query.$or = [
        { fromNumber: { $regex: search, $options: 'i' } },
        { toNumber: { $regex: search, $options: 'i' } },
        { callId: { $regex: search, $options: 'i' } }
      ];
    }

    // Get calls with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const calls = await CatiCall.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CatiCall.countDocuments(query);

    res.json({
      success: true,
      data: calls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching CATI calls:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calls',
      error: error.message
    });
  }
};

// @desc    Get single CATI call by ID
// @route   GET /api/cati/calls/:id
// @access  Private (Company Admin only)
const getCallById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;

    const call = await CatiCall.findOne({ _id: id, company: companyId })
      .populate('createdBy', 'name email');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    res.json({
      success: true,
      data: call
    });

  } catch (error) {
    console.error('Error fetching CATI call:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching call',
      error: error.message
    });
  }
};

// @desc    Manually check and update call status (for testing/debugging)
// @route   POST /api/cati/calls/:id/check-status
// @access  Private (Company Admin only)
const checkCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.company;

    const call = await CatiCall.findOne({ _id: id, company: companyId });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // If webhook already received, return current status
    if (call.webhookReceived) {
      return res.json({
        success: true,
        message: 'Webhook already received',
        data: call,
        webhookReceived: true
      });
    }

    // Log that manual check was requested
    console.log(`🔍 Manual status check requested for call: ${call.callId}`);

    res.json({
      success: true,
      message: 'Call status check completed. Webhook will update when DeepCall sends it.',
      data: call,
      webhookReceived: call.webhookReceived,
      note: 'If webhook is not received, please verify webhook URL is correctly configured in DeepCall dashboard: https://opine.exypnossolutions.com/api/cati/webhook'
    });

  } catch (error) {
    console.error('Error checking call status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking call status',
      error: error.message
    });
  }
};

// @desc    Get CATI call statistics
// @route   GET /api/cati/stats
// @access  Private (Company Admin only)
const getCallStats = async (req, res) => {
  try {
    const companyId = req.user.company;

    const stats = await CatiCall.aggregate([
      { $match: { company: companyId } },
      {
        $group: {
          _id: '$callStatus',
          count: { $sum: 1 },
          totalDuration: { $sum: '$callDuration' },
          avgDuration: { $avg: '$callDuration' }
        }
      }
    ]);

    const totalCalls = await CatiCall.countDocuments({ company: companyId });
    const successfulCalls = await CatiCall.countDocuments({ 
      company: companyId, 
      callStatus: 'completed' 
    });
    const failedCalls = await CatiCall.countDocuments({ 
      company: companyId, 
      callStatus: 'failed' 
    });
    const initiatedCalls = await CatiCall.countDocuments({ 
      company: companyId, 
      callStatus: 'initiated' 
    });
    const totalDuration = await CatiCall.aggregate([
      { $match: { company: companyId } },
      { $group: { _id: null, total: { $sum: '$callDuration' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalCalls,
        successfulCalls,
        failedCalls: failedCalls, // Only count actual failures, not initiated
        initiatedCalls: initiatedCalls,
        totalDuration: totalDuration[0]?.total || 0,
        statusBreakdown: stats
      }
    });

  } catch (error) {
    console.error('Error fetching CATI call stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching call statistics',
      error: error.message
    });
  }
};

module.exports = {
  makeCall,
  receiveWebhook,
  getCalls,
  getCallById,
  getCallStats,
  checkCallStatus
};

