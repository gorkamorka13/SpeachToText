import React from 'react';
import { RefreshCw } from 'lucide-react';

const TokenCounter = ({ tokenUsage, onReset }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium uppercase tracking-wider border-l border-gray-200 dark:border-gray-700 pl-4 ml-2">
      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500" title={`P:${tokenUsage.lastPrompt || 0} R:${tokenUsage.lastResponse || 0}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400/50"></span>
        Dernier : <span className="text-purple-600 dark:text-purple-400 font-bold">{(tokenUsage.lastPrompt || 0) + (tokenUsage.lastResponse || 0)}</span>
      </div>
      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50"></span>
        Session : <span className="text-blue-600 dark:text-blue-400 font-bold">{tokenUsage.totalSession || 0}</span>
      </div>
      <button
        onClick={onReset}
        className="text-[10px] text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1 ml-1"
        title="Réinitialiser le compteur de session"
      >
        <RefreshCw className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

export default TokenCounter;
