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

### No key in the build
- There is **no** `VITE_*` secret and no `.env` file: nothing about API keys
  is embedded in the production bundle.
- Users enter their own **free** keys at runtime (Settings → Fournisseur IA):
  - **Gemini**: a free key from https://aistudio.google.com (Flash models work
    on the free tier). Stored in `localStorage` under `geminiApiKey`.
  - **OpenRouter**: a free key from https://openrouter.ai/keys used for the
    `:free` models. Stored in `localStorage` under `openrouterApiKey`.

**Trade-off**: storing user-supplied keys in `localStorage` is a deliberate
choice for this client-side-only app (same approach as desktop tools like
Screen2LaTeX's plain-JSON config). Acceptable for personal / single-user
deployments since the key never leaves the user's machine. For a PUBLIC
multi-user deployment, switch to a backend proxy instead and do not ask
end users to paste keys.

### Leak protection
- `hooks/pre-commit` (enabled via `git config core.hooksPath hooks`) blocks
  any commit containing a key pattern (Gemini `AIzaSy…`, OpenRouter
  `sk-or-v1-…`, Anthropic `sk-ant-…`, Google Cloud `AQ.Ab8RN6…`).
- `.github/workflows/secret-scan.yml` scans the whole git history on every
  push/PR — output is masked, the key itself never appears in CI logs.
- `index.html` ships a Content-Security-Policy limiting what a successful
  XSS could exfiltrate from `localStorage`.

## 3. Input & Payload Validation (client-side only)

This app has **no backend**: it is a static SPA and every AI call goes straight
from the browser to the provider. There is therefore no server-side code to
validate inputs, and the previously mentioned `netlify/functions/` layer no
longer exists in this repository.

Validation is performed in `src/utils/securityUtils.js` and `src/services/aiService.js`:

- **File validation**: size limits and MIME type checking before any upload
- **Allowed MIME types**: `audio/webm`, `audio/wav`, `audio/mp3`, etc.
- **Allowed extensions**: `webm`, `wav`, `mp3`, `mp4`, `m4a`, `ogg`, `flac`
- **Filename sanitization**: prevents directory traversal
- **Payload size check**: Gemini's inlineData limit (20 MB) is enforced before
  each request; larger files are sent as chunks
- **Token isolation**: a `geminiApiKey`/`openrouterApiKey` typed by the user is
  trimmed and kept in memory only, and error messages are scrubbed of anything
  resembling a key (`AIzaSy…`, `sk-or-v1-…`, `token`, `secret`, `password`)

**If you ever add a backend proxy** (recommended for a public multi-user
deployment), re-validate everything server-side: request body JSON parsing with
error handling, model-name allow-list, file size limits, MIME checking and
control-character / null-byte stripping.

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

A `Content-Security-Policy` **meta tag ships in `index.html`** (see that file for
the exact policy: provider endpoints, flagcdn for the language flags, local
Whisper, Vite HMR websocket).

When deploying, also set the other headers at the host level:

```
Content-Security-Policy: (same policy as index.html, served as a header)
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

- [x] Input sanitization on all user inputs (DOMPurify)
- [x] No API key embedded in the build (no `VITE_*` secret, no `.env`)
- [x] User keys stored locally only (`localStorage`), never sent anywhere but the provider
- [x] Key masking in error messages
- [x] Pre-commit hook + CI secret scan
- [x] Content-Security-Policy shipped in `index.html`
- [x] XSS prevention with DOMPurify
- [x] Filename sanitization
- [x] File type validation
- [x] Whisper local server bound to `127.0.0.1` with restricted CORS (+ optional token)
- [x] React.memo for performance
- [x] useCallback for event handlers
- [ ] HTTPS enforced (configure at the host: Netlify / Vercel / GitHub Pages)
- [ ] Extra security headers set at the host level (`_headers` file for Netlify)
- [ ] Rate limiting (consider a backend proxy if the app is made public)

## Reporting Security Issues

If you discover a security vulnerability, please report it by opening an issue on the GitHub repository.

## Additional Resources

- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [React Security Best Practices](https://reactjs.org/docs/security.html)
