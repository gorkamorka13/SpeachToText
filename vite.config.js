import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import fs from 'fs';

// Generate version info
const getVersionInfo = () => {
  try {
    // Get package.json version
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const version = packageJson.version;
    
    // Get git commit hash (short)
    let commitHash = 'unknown';
    try {
      commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    } catch (e) {
      console.log('Git not available, using default commit hash');
    }
    
    // Get git branch
    let branch = 'unknown';
    try {
      branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    } catch (e) {
      console.log('Git not available, using default branch');
    }
    
    // Get build date
    const now = new Date();
    const buildDate = now.toISOString();
    const buildDateFormatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return {
      version,
      commitHash,
      branch,
      buildDate,
      buildDateFormatted,
      fullVersion: `v${version} (${commitHash}) - ${buildDateFormatted}`
    };
  } catch (error) {
    console.error('Error generating version info:', error);
    const now = new Date();
    return {
      version: '0.0.0',
      commitHash: 'unknown',
      branch: 'unknown',
      buildDate: now.toISOString(),
      buildDateFormatted: `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`,
      fullVersion: 'v0.0.0 (unknown)'
    };
  }
};

const versionInfo = getVersionInfo();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative path for portability between GitHub Pages and Netlify
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(versionInfo.version),
    __APP_COMMIT__: JSON.stringify(versionInfo.commitHash),
    __APP_BRANCH__: JSON.stringify(versionInfo.branch),
    __APP_BUILD_DATE__: JSON.stringify(versionInfo.buildDate),
    __APP_BUILD_DATE_FORMATTED__: JSON.stringify(versionInfo.buildDateFormatted),
    __APP_FULL_VERSION__: JSON.stringify(versionInfo.fullVersion),
  }
});
