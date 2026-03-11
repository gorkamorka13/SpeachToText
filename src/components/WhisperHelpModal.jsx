import React, { memo, useState } from 'react';
import { X, Terminal, Download, Play, Info, CheckCircle, Copy } from 'lucide-react';

const CodeBlock = ({ code, onCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            onCopy?.();
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Copy failed', e);
        }
    };

    return (
        <div className="relative group mt-1">
            <code className="block bg-gray-900 dark:bg-black/40 text-green-400 px-4 py-2.5 pr-10 rounded-lg font-mono text-[12px] select-all border border-gray-700 dark:border-gray-600 leading-relaxed">
                {code}
            </code>
            <button
                onClick={handleCopy}
                title="Copier"
                className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
};

const Step = ({ number, icon: Icon, title, color, children }) => (
    <div className="flex gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white ${color}`}>
            {number}
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm flex items-center gap-1.5 mb-1">
                {Icon && <Icon className="w-4 h-4 opacity-70" />}
                {title}
            </h3>
            {children}
        </div>
    </div>
);

const WhisperHelpModal = memo(({ show, onClose }) => {
    if (!show) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 dark:bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-600 to-indigo-600">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <Terminal className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-base leading-tight">Serveur Whisper Local</h2>
                            <p className="text-purple-200 text-xs">Guide de démarrage rapide</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                        title="Fermer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[70vh]">

                    {/* Info banner */}
                    <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                            Whisper tourne <strong>100% en local</strong> sur votre machine, aucune donnée n'est envoyée sur Internet.
                            Nécessite <strong>Python 3.8+</strong> installé.
                        </span>
                    </div>

                    {/* Steps */}
                    <div className="space-y-5">

                        {/* Step 1 */}
                        <Step number="1" icon={Download} title="Installer les dépendances (une seule fois)" color="bg-blue-500">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Ouvrez un <strong>terminal</strong> (cmd ou PowerShell) et exécutez :
                            </p>
                            <CodeBlock code="pip install flask flask-cors faster-whisper" />
                        </Step>

                        {/* Step 2 */}
                        <Step number="2" icon={Download} title="Télécharger & placer le fichier serveur" color="bg-indigo-500">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                                Téléchargez <strong>whisper_server.py</strong> et placez-le dans un dossier dédié accessible en ligne de commande, par exemple :
                            </p>
                            <CodeBlock code="C:\whisper\whisper_server.py" />
                            <a
                                href="/whisper_server.py"
                                download="whisper_server.py"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors mt-2"
                            >
                                <Download className="w-3.5 h-3.5" />
                                whisper_server.py
                            </a>
                            <div className="mt-2 flex gap-1.5 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded text-[11px] text-amber-700 dark:text-amber-400">
                                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span>Sous Windows, le fichier doit se trouver dans le répertoire <strong>depuis lequel vous lancez la commande</strong> (ou dans un dossier du PATH).</span>
                            </div>
                        </Step>

                        {/* Step 3 */}
                        <Step number="3" icon={Play} title="Lancer le serveur" color="bg-purple-500">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Ouvrez <strong>cmd</strong> ou <strong>PowerShell</strong>, naviguez dans le dossier, puis lancez :
                            </p>
                            <CodeBlock code="cd C:\whisper" />
                            <div className="mt-1.5">
                                <CodeBlock code="python whisper_server.py" />
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                                Le modèle Whisper se télécharge automatiquement au premier lancement (~150 Mo). Ne fermez pas la fenêtre.
                            </p>
                        </Step>

                        {/* Step 4 */}
                        <Step number="4" icon={CheckCircle} title="Vérifier que le serveur est prêt" color="bg-green-500">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Le terminal affiche un message similaire à :
                            </p>
                            <div className="bg-gray-900 dark:bg-black/40 text-green-400 px-4 py-2.5 rounded-lg font-mono text-[11px] border border-gray-700 leading-relaxed">
                                <span className="text-gray-500">* </span>Running on{' '}
                                <span className="text-yellow-400">http://127.0.0.1:5000</span>
                                <br />
                                <span className="text-gray-500">* </span>Press CTRL+C to quit
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                                L'URL par défaut est <code className="text-purple-500 font-mono">http://localhost:5000/transcribe</code> — ne fermez pas ce terminal pendant l'utilisation.
                            </p>
                        </Step>

                    </div>

                    {/* Separator */}
                    <div className="border-t border-gray-100 dark:border-gray-700" />

                    {/* Tip */}
                    <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                            <strong>Modèles disponibles :</strong> <code>tiny</code> (rapide), <code>base</code> (défaut), <code>small</code>, <code>medium</code>, <code>large</code>.
                            Modifiez la variable <code>MODEL_SIZE</code> dans <code>whisper_server.py</code> selon vos besoins.
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors"
                    >
                        Compris, fermer
                    </button>
                </div>
            </div>
        </div>
    );
});

WhisperHelpModal.displayName = 'WhisperHelpModal';
export default WhisperHelpModal;
