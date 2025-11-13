const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'opine-audio-recordings';

/**
 * Upload audio file to AWS S3
 * @param {string} filePath - Local file path
 * @param {string} key - S3 object key
 * @param {Object} metadata - File metadata
 * @returns {Promise<string>} - S3 URL
 */
const uploadToS3 = async (filePath, key, metadata = {}) => {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: filePath.endsWith('.wav') ? 'audio/wav' : 'audio/webm',
      Metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString()
      },
      // Make file publicly readable (adjust as needed for security)
      ACL: 'private'
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

/**
 * Generate pre-signed URL for secure access to S3 object
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Pre-signed URL
 */
const getSignedUrl = async (key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    };

    return await s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

/**
 * Delete file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} - Success status
 */
const deleteFromS3 = async (key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return false;
  }
};

/**
 * Check if S3 is configured
 * @returns {boolean}
 */
const isS3Configured = () => {
  return !!(process.env.AWS_ACCESS_KEY_ID && 
           process.env.AWS_SECRET_ACCESS_KEY && 
           process.env.AWS_S3_BUCKET_NAME);
};

module.exports = {
  uploadToS3,
  getSignedUrl,
  deleteFromS3,
  isS3Configured,
  BUCKET_NAME
};
