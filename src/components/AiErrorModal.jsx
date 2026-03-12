import React, { memo } from 'react';
import { AlertCircle, X, ChevronRight, MessageSquare, Terminal } from 'lucide-react';

const AiErrorModal = memo(({ show, onClose, error, transcriptSnippet }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-0 max-w-lg w-full overflow-hidden border border-red-100 dark:border-red-900/30 transform scale-100 transition-all">
                {/* Header Side Banner */}
                <div className="bg-red-500 h-2 w-full"></div>
                
                <div className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Échec de l'Analyse IA</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                La transcription a réussi (Whisper local), mais l'étape d'analyse via Gemini a rencontré un obstacle.
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Technical Error */}
                    <div className="mb-6 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-red-500 uppercase tracking-widest">
                            <Terminal className="w-3 h-3" />
                            Détail Technique
                        </div>
                        <p className="text-xs font-mono text-gray-600 dark:text-red-300 break-all bg-white dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-700 shadow-inner">
                            {error || "L'IA n'a renvoyé aucune réponse exploitable."}
                        </p>
                    </div>

                    {/* Transcript Conservation Proof */}
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Transcription conservée
                        </h3>
                        <div className="bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300 italic line-clamp-2">
                            "{transcriptSnippet}..."
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onClose}
                            className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                        >
                            Conserver la transcription telle quelle
                        </button>
                        <p className="text-[10px] text-center text-gray-400">
                            Vous pouvez relancer l'analyse manuellement avec le bouton <span className="font-bold">Analyser avec IA</span>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default AiErrorModal;
