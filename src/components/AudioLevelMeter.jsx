import React, { memo, useMemo } from 'react';

// Message affiché lorsque la surveillance permanente du micro n'est pas active
const STATUS_MESSAGES = {
  idle: { text: 'Initialisation...', className: 'text-gray-500 dark:text-gray-400' },
  denied: { text: 'Micro bloqué', className: 'text-red-600 dark:text-red-400' },
  error: { text: 'Micro indisponible', className: 'text-amber-600 dark:text-amber-400' },
  unsupported: { text: 'Non supporté', className: 'text-amber-600 dark:text-amber-400' }
};

const AudioLevelMeter = memo(({ volumeLevel = 0, status = 'live', label = '', threshold = null }) => {
  const percentage = useMemo(() => Math.round((volumeLevel / 128) * 100), [volumeLevel]);
  // Seuil de silence de l'arrêt automatique, sur la même échelle que les barres
  const thresholdPercent = threshold > 0 ? Math.min(100, (threshold / 128) * 100) : null;
  const statusInfo = STATUS_MESSAGES[status];
  // Micro inaccessible : les barres restent éteintes et un statut est affiché
  const isInactive = Boolean(statusInfo);
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <div className="flex gap-0.5">
            <div className={`w-0.5 h-2 rounded-full ${isInactive ? 'bg-gray-400 dark:bg-gray-500' : 'bg-purple-500 animate-pulse'}`} style={{ animationDelay: '0s' }}></div>
            <div className={`w-0.5 h-3 rounded-full ${isInactive ? 'bg-gray-400 dark:bg-gray-500' : 'bg-purple-500 animate-pulse'}`} style={{ animationDelay: '0.1s' }}></div>
            <div className={`w-0.5 h-2 rounded-full ${isInactive ? 'bg-gray-400 dark:bg-gray-500' : 'bg-purple-500 animate-pulse'}`} style={{ animationDelay: '0.2s' }}></div>
          </div>
          Niveau Signal
          {label ? <span className="font-normal normal-case tracking-normal text-gray-400 dark:text-gray-500"> · {label}</span> : null}
        </span>
        <span className={`text-[10px] font-mono font-medium ${statusInfo ? statusInfo.className : 'text-purple-600 dark:text-purple-400'}`}>
          {statusInfo ? statusInfo.text : `${percentage}%`}
        </span>
      </div>
      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex gap-0.5">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-sm transition-all duration-75 ${!isInactive && (volumeLevel / 128) > (i / 20)
              ? i > 15
                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                : i > 10
                  ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                  : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
              : 'bg-gray-300 dark:bg-gray-900 border-none shadow-none'
              }`}
          ></div>
        ))}
        {thresholdPercent !== null && !isInactive && (
          <div
            data-testid="silence-threshold"
            title="Seuil de silence : sous ce trait, l'arrêt automatique compte du silence"
            className="absolute top-0 bottom-0 w-0.5 bg-purple-700 dark:bg-purple-300"
            style={{ left: `${thresholdPercent}%` }}
          ></div>
        )}
      </div>
      {status === 'denied' && (
        <p className="mt-1.5 text-[10px] leading-tight text-red-600 dark:text-red-400">
          Autorisez le microphone dans le navigateur pour retrouver le niveau.
        </p>
      )}
    </div>
  );
});

export default AudioLevelMeter;
