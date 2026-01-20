import React from 'react';

const AudioLevelMeter = ({ volumeLevel }) => {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
            <div className="w-0.5 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-0.5 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          </div>
          Niveau Signal
        </span>
        <span className="text-[10px] font-mono font-medium text-purple-600 dark:text-purple-400">
          {Math.round((volumeLevel / 128) * 100)}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex gap-0.5">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-sm transition-all duration-75 ${(volumeLevel / 128) > (i / 20)
              ? i > 15
                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                : i > 10
                  ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                  : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
              : 'bg-gray-300 dark:bg-gray-900 border-none shadow-none'
              }`}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default AudioLevelMeter;
