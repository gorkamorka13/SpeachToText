import React, { memo } from 'react';
import { GitCommit, Calendar, Tag } from 'lucide-react';

const VersionInfo = memo(({ className = '' }) => {
  // Access version info from global variables injected by Vite
  const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
  const commit = typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : 'unknown';
  const branch = typeof __APP_BRANCH__ !== 'undefined' ? __APP_BRANCH__ : 'unknown';
  const buildDate = typeof __APP_BUILD_DATE_FORMATTED__ !== 'undefined' ? __APP_BUILD_DATE_FORMATTED__ : 'unknown';
  const fullVersion = typeof __APP_FULL_VERSION__ !== 'undefined' ? __APP_FULL_VERSION__ : 'v0.0.0';

  return (
    <div className={`text-[10px] text-gray-400 dark:text-gray-500 flex flex-wrap items-center justify-center gap-3 ${className}`}>
      <span className="flex items-center gap-1" title={fullVersion}>
        <Tag className="w-3 h-3" />
        v{version}
      </span>
      <span className="flex items-center gap-1" title={`Branch: ${branch}`}>
        <GitCommit className="w-3 h-3" />
        {commit}
      </span>
      <span className="flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        {buildDate}
      </span>
    </div>
  );
});

export default VersionInfo;
