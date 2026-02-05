import React, { memo } from 'react';
import { Check } from 'lucide-react';

const SuccessModal = memo(({ show, onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border border-green-100 dark:border-green-900 transform scale-100 transition-all">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Sauvegarde réussie !</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
          Tous les fichiers ont été générés et téléchargés avec succès.
        </p>
        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400 mb-6 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-left border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Transcription (PDF)
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Texte brut (.txt)
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Audio (.webm)
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
        >
          Fermer
        </button>
      </div>
    </div>
  );
});

export default SuccessModal;
