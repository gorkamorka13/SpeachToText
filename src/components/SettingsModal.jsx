import React, { memo, useCallback, useState } from 'react';
import { Settings, X, FileText, Info, Bot, Clock } from 'lucide-react';
import { testAIConnection } from '../services/providers/providerFactory';
import {
  SILENCE_TIMEOUT_OPTIONS,
  MAX_RECORDING_OPTIONS,
  DEFAULT_SILENCE_TIMEOUT,
  DEFAULT_MAX_RECORDING_MINUTES
} from '../utils/audioUtils';

const GEMINI_MODELS = [
  { value: 'gemini-3.1-flash-lite', label: '⚡ Gemini 3.1 Flash Lite (Rapide, gratuit)' },
  { value: 'custom', label: '✏️ Autre modèle...' },
];

// Free vision-capable models on OpenRouter (":free" tier, no billing needed).
// The catalog changes over time — the "Autre modèle..." option lets users
// enter any current model id without a code change.
const OPENROUTER_FREE_MODELS = [
  { value: 'google/gemma-3-27b-it:free', label: '🟢 Gemma 3 27B (gratuit, vision)' },
  { value: 'meta-llama/llama-4-scout:free', label: '🟢 Llama 4 Scout (gratuit, vision)' },
  { value: 'qwen/qwen2.5-vl-72b-instruct:free', label: '🟢 Qwen2.5 VL 72B (gratuit, vision)' },
  { value: 'custom', label: '✏️ Autre modèle...' },
];

const SettingsModal = memo(({
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
  setWhisperUrl,
  whisperToken,
  setWhisperToken,
  aiProvider,
  setAiProvider,
  openrouterApiKey,
  setOpenrouterApiKey,
  openrouterModel,
  setOpenrouterModel,
  geminiApiKey,
  setGeminiApiKey,
  // Réglages d'enregistrement (valeurs par défaut pour rester compatible
  // avec un usage sans props explicites)
  autoStopSilence = true,
  setAutoStopSilence = () => { },
  silenceTimeout = DEFAULT_SILENCE_TIMEOUT,
  setSilenceTimeout = () => { },
  maxRecordingMinutes = DEFAULT_MAX_RECORDING_MINUTES,
  setMaxRecordingMinutes = () => { }
}) => {
  // Hooks BEFORE any conditional return (rules of hooks — the modal can be
  // mounted with show=false and then toggled to true).
  const [connState, setConnState] = useState({ status: 'idle', message: '' });

  const isKnownModel = GEMINI_MODELS.some(m => m.value !== 'custom' && m.value === aiModel);
  const selectValue = isKnownModel ? aiModel : 'custom';

  const isKnownOpenRouterModel = OPENROUTER_FREE_MODELS.some(m => m.value !== 'custom' && m.value === openrouterModel);
  const openRouterSelectValue = isKnownOpenRouterModel ? openrouterModel : 'custom';

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val !== 'custom') setAiModel(val);
    else setAiModel('');
  };

  const handleOpenRouterSelectChange = (e) => {
    const val = e.target.value;
    if (val !== 'custom') setOpenrouterModel(val);
    else setOpenrouterModel('');
  };

  const handleTestConnection = async () => {
    setConnState({ status: 'testing', message: '' });
    const result = await testAIConnection({
      provider: aiProvider,
      model: aiProvider === 'openrouter' ? openrouterModel : aiModel,
      openrouterApiKey
    });
    setConnState({ status: result.ok ? 'ok' : 'error', message: result.message });
  };

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
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 mt-3">
              Token partagé (optionnel — requis seulement si le serveur définit WHISPER_TOKEN)
            </label>
            <input
              type="password"
              value={whisperToken}
              onChange={(e) => setWhisperToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Laisser vide si le serveur n'exige pas de token"
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

        {/* AI Provider Configuration */}
        <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-500" />
            Fournisseur IA
          </h3>
          <select
            value={aiProvider}
            onChange={(e) => { setAiProvider(e.target.value); setConnState({ status: 'idle', message: '' }); }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3"
          >
            <option value="gemini">Google Gemini (palier gratuit, modèles Flash)</option>
            <option value="openrouter">OpenRouter (modèles :free)</option>
          </select>

          {aiProvider === 'gemini' ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Clé API Gemini <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => { setGeminiApiKey(e.target.value); setConnState({ status: 'idle', message: '' }); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Collez votre clé gratuite AI Studio ici"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Clé gratuite sur{' '}
                <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">aistudio.google.com</a>
                {' '}— les modèles « Flash » fonctionnent sans facturation. Stockée localement sur votre machine uniquement.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Clé API OpenRouter <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={openrouterApiKey}
                onChange={(e) => { setOpenrouterApiKey(e.target.value); setConnState({ status: 'idle', message: '' }); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="sk-or-v1-..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Clé gratuite sur{' '}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">openrouter.ai/keys</a>.
                {' '}⚠️ OpenRouter ne gère pas la transcription audio : gardez Gemini ou Whisper pour la transcription, OpenRouter pour l'Analyse IA et la Traduction.
              </p>
            </div>
          )}
        </div>

        {/* Model Configuration */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {aiProvider === 'gemini' ? (
              <>Modèle Gemini (Cloud) <span className="text-red-500">*</span></>
            ) : (
              <>Modèle OpenRouter <span className="text-red-500">*</span></>
            )}
          </label>
          {aiProvider === 'gemini' ? (
            <select
              value={selectValue}
              onChange={handleSelectChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {GEMINI_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          ) : (
            <select
              value={openRouterSelectValue}
              onChange={handleOpenRouterSelectChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {OPENROUTER_FREE_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          )}
          {aiProvider === 'gemini' && selectValue === 'custom' && (
            <input
              type="text"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className={`mt-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${!aiModel ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              placeholder="Ex: gemini-1.5-pro"
            />
          )}
          {aiProvider === 'openrouter' && openRouterSelectValue === 'custom' && (
            <input
              type="text"
              value={openrouterModel}
              onChange={(e) => setOpenrouterModel(e.target.value)}
              className={`mt-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${!openrouterModel ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              placeholder="Ex: mistralai/mistral-small-3.2-24b-instruct:free"
            />
          )}
          {(aiProvider === 'gemini' ? !aiModel : !openrouterModel) && (
            <p className="text-xs text-red-500 mt-1">⚠️ Ce champ est obligatoire</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Utilisé pour l'Analyse IA et la Traduction. Modèle actif : <span className="font-mono font-bold">{(aiProvider === 'gemini' ? aiModel : openrouterModel) || '—'}</span>
          </p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <button
              onClick={handleTestConnection}
              disabled={connState.status === 'testing'}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors font-medium text-gray-700 dark:text-gray-200 disabled:opacity-50"
            >
              {connState.status === 'testing' ? 'Test en cours...' : '🔌 Tester la connexion'}
            </button>
            {connState.message && (
              <span className={`text-xs ${connState.status === 'ok' ? 'text-green-600 dark:text-green-400' : connState.status === 'error' ? 'text-red-500' : 'text-gray-500'}`}>
                {connState.message}
              </span>
            )}
          </div>
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

        {/* Recording Configuration */}
        <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            Enregistrement
          </h3>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Durée maximale d'enregistrement
            </label>
            <select
              value={maxRecordingMinutes}
              onChange={(e) => setMaxRecordingMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {MAX_RECORDING_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              À l'échéance, l'enregistrement s'arrête puis est sauvegardé automatiquement (1 heure par défaut).
            </p>
          </div>

          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700 mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Arrêt automatique sur silence</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoStopSilence}
                onChange={(e) => setAutoStopSilence(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Arrêt après un silence de
            </label>
            <select
              value={silenceTimeout}
              onChange={(e) => setSilenceTimeout(Number(e.target.value))}
              disabled={!autoStopSilence}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {SILENCE_TIMEOUT_OPTIONS.map(seconds => (
                <option key={seconds} value={seconds}>
                  {seconds} secondes{seconds === DEFAULT_SILENCE_TIMEOUT ? ' (défaut)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              L'enregistrement s'arrête et est sauvegardé après ce temps sans son détecté (30, 40 ou 50 s).
            </p>
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
});

export default SettingsModal;
