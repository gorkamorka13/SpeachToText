# Security Measures

This document outlines the security measures implemented in the Speech-to-Text application.

## 1. Input Sanitization

### Client-Side Sanitization (`src/utils/securityUtils.js`)

All user inputs are sanitized before rendering or processing:

- **Text Inputs**: HTML tags and dangerous content are removed using DOMPurify
- **Filenames**: Invalid characters (`\\/:*?"<>|`) and path traversal sequences are removed
- **File Types**: Validated against allowed MIME types and extensions

### Implementation

```javascript
// Sanitize user input
import { sanitizeInput, sanitizeFilename, validateFileType } from './utils/securityUtils';

// In components
const safeText = sanitizeInput(userInput);
const safeFilename = sanitizeFilename(filename);
const isValidFile = validateFileType(file);
```

## 2. API Key Security

### Environment Variables
- API keys are stored in environment variables (`.env` file)
- Never stored in localStorage or client-side code
- Vite uses `import.meta.env.VITE_GEMINI_API_KEY`

### Netlify Environment Variables
- For production: Set `VITE_GEMINI_API_KEY` in Netlify dashboard
- Serverless functions use `process.env.VITE_GEMINI_API_KEY`

## 3. Server-Side Validation

### Netlify Functions (`netlify/functions/`)

All server-side code validates and sanitizes inputs:

- **Request Body Validation**: JSON parsing with error handling
- **Model Name Validation**: Ensures model names start with 'gemini-'
- **File Validation**: Size limits and MIME type checking
- **Input Sanitization**: Removal of control characters and null bytes

### File Validation

Server-side file validation includes:
- Maximum file size: 20MB
- Allowed MIME types: `audio/webm`, `audio/wav`, `audio/mp3`, etc.
- Allowed extensions: `webm`, `wav`, `mp3`, `mp4`, `m4a`, `ogg`, `flac`
- Filename sanitization to prevent directory traversal

## 4. XSS Prevention

### HTML Escaping
- User-generated content is escaped before rendering
- DOMPurify removes all HTML tags from text inputs
- React's built-in XSS protection is used ( JSX auto-escaping)

### Email Security
- Email subject and body use `encodeURIComponent()`
- Recipient addresses are sanitized before use in mailto links

## 5. Performance Optimizations

### React.memo
All components use `React.memo` to prevent unnecessary re-renders:
- `LanguageSelector`
- `SettingsModal`
- `AudioLevelMeter`
- `SuccessModal`
- `TokenCounter`
- `EmailModal`

### useCallback & useMemo
- Event handlers wrapped in `useCallback`
- Expensive computations cached with `useMemo`

## 6. Secure HTTP Headers

When deploying, ensure these headers are set:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## 7. File Upload Security

### Client-Side Checks
- MIME type validation
- Extension validation
- File size checks (20MB limit)

### Server-Side (if implemented)
- Additional MIME type verification
- Magic number checking
- Virus scanning (recommended for production)

## Security Checklist

- [x] Input sanitization on all user inputs
- [x] API keys in environment variables only
- [x] Server-side validation in Netlify functions
- [x] XSS prevention with DOMPurify
- [x] Filename sanitization
- [x] File type validation
- [x] React.memo for performance
- [x] useCallback for event handlers
- [ ] HTTPS enforced (configure in Netlify)
- [ ] Security headers (add _headers file for Netlify)
- [ ] Rate limiting (consider adding to Netlify functions)

## Reporting Security Issues

If you discover a security vulnerability, please report it by opening an issue on the GitHub repository.

## Additional Resources

- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://reactjs.org/docs/security.html)
