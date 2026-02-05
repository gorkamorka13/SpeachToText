import DOMPurify from 'dompurify';

/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and dangerous content
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  // First, use DOMPurify to clean HTML
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true // Keep text content
  });
  
  return clean;
};

/**
 * Sanitize filename to prevent directory traversal and invalid characters
 */
export const sanitizeFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return '';
  
  // Remove path traversal characters and invalid filename characters
  return filename
    .replace(/[\\/:*?"<>|]/g, '') // Remove invalid characters
    .replace(/^(\.\.)+/g, '') // Remove leading ../
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single
    .trim();
};

/**
 * Validate file type against allowed types
 * Client-side validation (should be complemented by server-side)
 */
export const validateFileType = (file, allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'video/webm']) => {
  if (!file) return false;
  
  // Check MIME type
  if (allowedTypes.includes(file.type)) return true;
  
  // Check file extension as fallback
  const extension = file.name.toLowerCase().split('.').pop();
  const allowedExtensions = ['webm', 'wav', 'mp3', 'mp4', 'm4a', 'ogg'];
  
  return allowedExtensions.includes(extension);
};

/**
 * Escape HTML special characters for safe rendering
 */
export const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};
