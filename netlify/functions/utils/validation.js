/**
 * Server-side file validation for Netlify Functions
 * Validates file types, sizes, and content on the server
 */

// Allowed MIME types
const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/flac',
  'video/webm' // WebM can contain audio
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['webm', 'wav', 'mp3', 'mp4', 'm4a', 'ogg', 'flac'];

// Maximum file size (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Validate file metadata on server side
 * @param {Object} fileMetadata - File metadata object
 * @param {string} fileMetadata.name - Filename
 * @param {string} fileMetadata.type - MIME type
 * @param {number} fileMetadata.size - File size in bytes
 * @returns {Object} - Validation result
 */
export const validateFileServerSide = (fileMetadata) => {
  const { name, type, size } = fileMetadata;
  
  // Check if file exists
  if (!name || !type || size === undefined) {
    return {
      valid: false,
      error: 'Invalid file metadata'
    };
  }
  
  // Check file size
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }
  
  // Check MIME type
  if (!ALLOWED_AUDIO_TYPES.includes(type.toLowerCase())) {
    // Check extension as fallback
    const extension = name.toLowerCase().split('.').pop();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file type: ${type}. Allowed types: ${ALLOWED_AUDIO_TYPES.join(', ')}`
      };
    }
  }
  
  // Sanitize filename
  const sanitizedName = name.replace(/[\\/:*?"<>|]/g, '').replace(/\.{2,}/g, '.');
  
  return {
    valid: true,
    sanitizedName,
    type,
    size
  };
};

/**
 * Sanitize user input to prevent injection attacks
 * @param {string} input - User input
 * @returns {string} - Sanitized input
 */
export const sanitizeServerInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove null bytes
  let sanitized = input.replace(/\x00/g, '');
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized;
};

/**
 * Validate API request body
 * @param {Object} body - Request body
 * @returns {Object} - Validation result
 */
export const validateApiRequest = (body) => {
  try {
    const parsed = typeof body === 'string' ? JSON.parse(body) : body;
    
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Invalid request body' };
    }
    
    // Sanitize all string fields
    const sanitized = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeServerInput(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return { valid: true, data: sanitized };
  } catch (error) {
    return { valid: false, error: 'Invalid JSON in request body' };
  }
};
