import React from 'react';
import { Settings, X, FileText, Info } from 'lucide-react';

const SettingsModal = ({
  show,
  onClose,
  aiModel,
  setAiModel,
  aiInstructions,
  setAiInstructions,
  pdfJustify,
  setPdfJustify,
  transcriptionEngine,
  setTranscriptionEngine,
  whisperUrl,
  setWhisperUrl
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-lg w-full transform transition-all border border-gray-100 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            Configuration
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Optional Whisper Configuration */}
        {transcriptionEngine === 'whisper' && (
          <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu text-purple-500"><rect width="16" height="16" x="4" y="4" rx="2" /><rect width="6" height="6" x="9" y="9" rx="1" /><path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" /><path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" /></svg>
              Configuration Whisper Local
            </h3>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              URL du serveur Whisper local
            </label>
            <input
              type="text"
              value={whisperUrl}
              onChange={(e) => setWhisperUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="http://localhost:5000/transcribe"
            />
            <div className="mt-2 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex flex-col gap-2 w-full mt-1">
                <div>
                  <span className="font-semibold opacity-90 block mb-1">1. Installer (une seule fois) :</span>
                  <code className="bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded border border-amber-200 dark:border-amber-800/50 font-mono select-all block w-full text-[11px]">pip install flask flask-cors faster-whisper</code>
                </div>
                <div>
                  <span className="font-semibold opacity-90 block mb-1">2. Lancer le serveur :</span>
                  <code className="bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded border border-amber-200 dark:border-amber-800/50 font-mono select-all block w-full text-[11px]">python whisper_server.py</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Model Configuration */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Modèle Gemini (Cloud)
          </label>
          <input
            type="text"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="gemini-2.0-flash"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Utilisé pour l'Analyse IA et la Traduction.
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Instructions pour l'analyse
          </label>
          <textarea
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent h-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Entrez vos instructions ici..."
          />
        </div>

        {/* PDF Configuration */}
        <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            Paramètres PDF
          </h3>
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Justifier le texte</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={pdfJustify}
                onChange={(e) => setPdfJustify(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
