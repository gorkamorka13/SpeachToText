# Versioning System

This application uses an **automatic versioning system** that generates version information at build time.

## How It Works

The versioning system is integrated into the Vite build process (`vite.config.js`) and automatically captures:

### Version Components

1. **Package Version** (`package.json`)
   - Semantic version from `package.json` (e.g., `0.0.0`)

2. **Git Commit Hash**
   - Short SHA of the current commit (e.g., `a1b2c3d`)
   - Helps track exactly which code version is deployed

3. **Git Branch**
   - Current branch name (e.g., `main`, `develop`)
   - Useful for distinguishing between production and development builds

4. **Build Date & Time**
   - When the build was created
   - Format: `DD/MM/YYYY HH:MM`

### Full Version Format
```
v{packageVersion} ({commitHash}) - {buildDate}
```

Example: `v0.0.0 (a1b2c3d) - 05/02/2026 14:30`

## Global Variables

The following global variables are injected during build and available throughout the app:

- `__APP_VERSION__` - Package version (e.g., "0.0.0")
- `__APP_COMMIT__` - Git commit hash (e.g., "a1b2c3d")
- `__APP_BRANCH__` - Git branch name (e.g., "main")
- `__APP_BUILD_DATE__` - ISO build date
- `__APP_BUILD_DATE_FORMATTED__` - Formatted date (DD/MM/YYYY HH:MM)
- `__APP_FULL_VERSION__` - Complete version string

## Display

The version information is displayed in the footer of the application using the `VersionInfo` component, showing:
- Version tag (e.g., v0.0.0)
- Git commit hash
- Build date

Hover over the version info to see the full version string with branch information.

## Manual Version Bump

To update the version:

```bash
# Update version in package.json
npm version patch  # 0.0.0 -> 0.0.1
npm version minor  # 0.0.1 -> 0.1.0
npm version major  # 0.1.0 -> 1.0.0
```

Then rebuild:
```bash
npm run build
```

## CI/CD Integration

When deploying via Netlify or GitHub Actions, the version will automatically reflect:
- The commit being deployed
- The branch being built
- The exact build timestamp

This makes it easy to track which version is running in production.
