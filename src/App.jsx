import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Copy, Download, Save, Trash2, Mic, FileAudio, Settings, Mail, Speaker, Clock, FileText, FileBadge, Volume2, Square, MicOff, Languages, Moon, Sun, X } from 'lucide-react';

// Components
import LanguageSelector from './components/LanguageSelector';
import SettingsModal from './components/SettingsModal';
import SuccessModal from './components/SuccessModal';
import EmailModal from './components/EmailModal';
import TokenCounter from './components/TokenCounter';
import AudioLevelMeter from './components/AudioLevelMeter';

// Services & Utils
import { callGemini, extractTextFromResponse, transcribeWithWhisper, fileToGenerativePart, translateWithGemini } from './services/aiService';
import { trimSilence } from './utils/audioUtils';
import { sanitizeInput, sanitizeFilename, validateFileType, escapeHtml } from './utils/securityUtils';
import { generatePDF, downloadDOCX } from './services/exportService';

// Hooks
import { useDarkMode, useDebounce, useNotification } from './hooks';

export default function SpeechToTextApp() {
    // -----------------------------------------------------------------
    // 1. ALL STATE DECLARATIONS
    // -----------------------------------------------------------------
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [translatedTranscript, setTranslatedTranscript] = useState('');
    const [enableTranslation, setEnableTranslation] = useState(() => {
        return localStorage.getItem('enableTranslation') === 'true';
    });
    const [language, setLanguage] = useState('fr-FR');
    const [targetLanguage, setTargetLanguage] = useState('en-US');
    const [savedTranscripts, setSavedTranscripts] = useState([]);
    const [isSupported, setIsSupported] = useState(true);

    // AI Agent States
    const [showSettings, setShowSettings] = useState(false);
    const [transcriptionMode, setTranscriptionMode] = useState('post'); // 'live' or 'post'
    const [transcriptionEngine, setTranscriptionEngine] = useState(() => {
        return localStorage.getItem('transcriptionEngine') || 'google'; // 'google' or 'whisper'
    });
    const [whisperUrl, setWhisperUrl] = useState(() => {
        return localStorage.getItem('whisperUrl') || 'http://localhost:5000/transcribe';
    });
    const [autoAnalyze, setAutoAnalyze] = useState(true);
    const [aiInstructions, setAiInstructions] = useState(() => {
        return (
          localStorage.getItem("aiInstructions") ||
          `Corrige ce texte en:
1) vérifiant l'orthographe,
2) supprimant les espaces manquants entre les mots,
3) supprimant les sauts de lignes inutiles,
4) supprimant les retours à la ligne inutiles,
5) supprimant les Carriage Return Line Feed et vérifie le texte,
7) supprimant les phrases en anglais (phrases de plus d'un mot),
6) identifiant des paragraphes dans ce texte,
8) mettant enfin en forme et produit le fichier texte brut`
        );
    });
    const [aiModel, setAiModel] = useState(() => {
        return localStorage.getItem('aiModel') || '';
    });
    const [aiResult, setAiResult] = useState('');
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('darkMode') === 'true';
    });
    const [customFilename, setCustomFilename] = useState('');
    const [audioBlob, setAudioBlob] = useState(null);
    const [autoStopSilence, setAutoStopSilence] = useState(true);
    const [silenceCountdown, setSilenceCountdown] = useState(15);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [hasDownloadedPDF, setHasDownloadedPDF] = useState(false);
    const [emailRecipient, setEmailRecipient] = useState('');
    const [emailSubject, setEmailSubject] = useState('Transcription Encounter');
    const [tokenUsage, setTokenUsage] = useState({
        lastPrompt: 0,
        lastResponse: 0,
        totalSession: 0
    });
    const [speakingSection, setSpeakingSection] = useState(null);
    const [errorLogs, setErrorLogs] = useState([]);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [retryDelay, setRetryDelay] = useState(0);

    // Custom hooks
    const { notification, showNotification } = useNotification();

    // Audio Settings
    const [enableSystemAudio, setEnableSystemAudio] = useState(() => {
        return localStorage.getItem('enableSystemAudio') === 'true';
    });

    const [pdfJustify, setPdfJustify] = useState(() => {
        const saved = localStorage.getItem('pdfJustify');
        return saved !== null ? saved === 'true' : true;
    });

    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);

    // -----------------------------------------------------------------
    // 2. ALL REF DECLARATIONS
    // -----------------------------------------------------------------
    // Refs for state access in async closures
    const transcriptRef = useRef('');
    const aiResultRef = useRef('');
    const translatedTranscriptRef = useRef('');
    const audioBlobRef = useRef(null);
    const errorLogsRef = useRef([]);
    const autoAnalyzeRef = useRef(autoAnalyze); // Also sync autoAnalyze to be safe

    const silenceTimerRef = useRef(null);
    const silenceStartRef = useRef(null);
    const isAutoSavingRef = useRef(false);
    const analyserRef = useRef(null);
    const audioContextRef = useRef(null); // Keep ref to close it
    const dataArrayRef = useRef(null);
    const animationFrameRef = useRef(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamsRef = useRef([]); // Keep track to stop tracks later

    const recognitionRef = useRef(null);
    const isListeningRef = useRef(false);

    // Auto-scroll refs
    const transcriptContainerRef = useRef(null);
    const transcriptEndRef = useRef(null);
    const aiResultContainerRef = useRef(null);
    const lastInterimUpdateRef = useRef(0); // Moved to top level
    const fileInputRef = useRef(null);

    // Refs for auto-sizing textareas
    const transcriptTextareaRef = useRef(null);
    const aiTextareaRef = useRef(null);
    const translationAreaRef = useRef(null);

    // Auto-resize effect
    useEffect(() => {
        const resize = (ref) => {
            if (ref.current) {
                ref.current.style.height = 'auto';
                // Cap height at roughly 10 lines (~260px)
                const newHeight = Math.min(ref.current.scrollHeight, 260);
                ref.current.style.height = `${newHeight}px`;
            }
        };
        resize(transcriptTextareaRef);
        resize(aiTextareaRef);
        resize(translationAreaRef);
    }, [transcript, aiResult, translatedTranscript, isListening, isTranscribing, isProcessingAI]);

    // Ensure source and target languages are never the same
    useEffect(() => {
        if (language === targetLanguage) {
            // If source became French, switch target to English, otherwise switch to French
            setTargetLanguage(language === 'fr-FR' ? 'en-US' : 'fr-FR');
        }
    }, [language, targetLanguage]);


    // -----------------------------------------------------------------
    // 3. INITIALIZATION & SYNC EFFECTS
    // -----------------------------------------------------------------

    // Sync Refs with State
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
    useEffect(() => { aiResultRef.current = aiResult; }, [aiResult]);
    useEffect(() => { translatedTranscriptRef.current = translatedTranscript; }, [translatedTranscript]);
    useEffect(() => { audioBlobRef.current = audioBlob; }, [audioBlob]);
    useEffect(() => { errorLogsRef.current = errorLogs; }, [errorLogs]);
    useEffect(() => { autoAnalyzeRef.current = autoAnalyze; }, [autoAnalyze]);

    // Toggle Dark Mode
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        }
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    useEffect(() => {
        localStorage.setItem('enableSystemAudio', enableSystemAudio);
    }, [enableSystemAudio]);

    useEffect(() => {
        localStorage.setItem('pdfJustify', pdfJustify);
    }, [pdfJustify]);

    const logError = useCallback((error, context = "") => {
        const timestamp = new Date().toLocaleTimeString();
        let errorMessage = error;
        let details = "";

        // Handle Error objects
        if (error instanceof Error) {
            errorMessage = error.message;
            if (error.stack) details = error.stack;
        }
        // Handle object errors (often from API)
        else if (typeof error === 'object') {
            try {
                errorMessage = JSON.stringify(error);
                // Try to extract readable message from common API error formats
                if (error.message) errorMessage = error.message;
                if (error.error && error.error.message) errorMessage = error.error.message;
            } catch (e) {
                errorMessage = "Objet erreur non parsable";
            }
        }

        // Clean up common JSON error strings
        if (typeof errorMessage === 'string' && errorMessage.startsWith('{"error":')) {
            try {
                const parsed = JSON.parse(errorMessage);
                if (parsed.error && parsed.error.message) {
                    errorMessage = `${parsed.error.code ? `[${parsed.error.code}] ` : ''}${parsed.error.message}`;
                    if (parsed.error.status) errorMessage += ` (${parsed.error.status})`;
                }
            } catch (e) { /* ignore parse error */ }
        }

        const logEntry = `[${timestamp}] ${context ? `[${context}] ` : ''}${errorMessage}`;
        console.error("APP ERROR:", logEntry, details);

        setErrorLogs(prev => [...prev, logEntry]);
        showNotification(`Erreur${context ? ' ' + context : ''}: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`);
    }, [showNotification]);

    const downloadErrorLog = useCallback(() => {
        if (errorLogsRef.current.length === 0) {
            showNotification("Aucun log d'erreur à sauvegarder.");
            return;
        }
        const element = document.createElement('a');
        const file = new Blob([errorLogsRef.current.join('\n')], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `error-log-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }, [showNotification]);

    // Save app settings to localStorage
    useEffect(() => {
        localStorage.setItem('aiInstructions', aiInstructions);
    }, [aiInstructions]);

    useEffect(() => {
        localStorage.setItem('aiModel', aiModel);
    }, [aiModel]);

    useEffect(() => {
        localStorage.setItem('transcriptionEngine', transcriptionEngine);
    }, [transcriptionEngine]);

    useEffect(() => {
        localStorage.setItem('whisperUrl', whisperUrl);
    }, [whisperUrl]);

    useEffect(() => {
        localStorage.setItem('enableTranslation', enableTranslation);
    }, [enableTranslation]);

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem('targetLanguage', targetLanguage);
    }, [targetLanguage]);

    useEffect(() => {
        localStorage.setItem('enableSystemAudio', enableSystemAudio);
    }, [enableSystemAudio]);

    // Auto-scroll Transcript
    useEffect(() => {
        if (isListening && transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [transcript, interimTranscript, isListening]);

    // Auto-scroll AI Result
    useEffect(() => {
        if (aiResultContainerRef.current) {
            aiResultContainerRef.current.scrollTop = aiResultContainerRef.current.scrollHeight;
        }
    }, [aiResult]);


    const handleSpeak = useCallback((text, section, langCode) => {
        if (speakingSection === section) {
            window.speechSynthesis.cancel();
            setSpeakingSection(null);
            return;
        }

        window.speechSynthesis.cancel();
        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        const searchLang = langCode || 'fr-FR';
        utterance.lang = searchLang;

        // Advanced voice selection
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            // Priority 1: Exact match for the language code
            let voice = voices.find(v => v.lang === searchLang);

            // Priority 2: Match by language prefix (e.g., any Arabic 'ar' voice)
            if (!voice) {
                const prefix = searchLang.split('-')[0];
                voice = voices.find(v => v.lang.startsWith(prefix));
            }

            if (voice) {
                utterance.voice = voice;
                console.log(`TTS: Using voice ${voice.name} for ${searchLang}`);
            } else {
                console.warn(`TTS: No specific voice found for ${searchLang}. Using default.`);
                if (searchLang.startsWith('ar')) {
                    showNotification("Voix arabe non installée sur votre PC. La lecture sera en langue par défaut.");
                }
            }
        }

        utterance.onend = () => setSpeakingSection(null);
        utterance.onerror = () => {
            console.error("TTS Error");
            setSpeakingSection(null);
        };

        setSpeakingSection(section);
        window.speechSynthesis.speak(utterance);
    }, [speakingSection, showNotification]);

    const copyToClipboard = useCallback(async (text) => {
        if (!text) {
            showNotification("Rien à copier.");
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            showNotification("Copié dans le presse-papier !");
        } catch (err) {
            console.error('Failed to copy: ', err);
            showNotification("Erreur lors de la copie.");
        }
    }, [showNotification]);



    const transcribePostProcess = async (directBlob = null) => {
        const blobToUse = (directBlob instanceof Blob) ? directBlob : audioBlob;

        if (!blobToUse || blobToUse.size === 0) {
            logError("Le fichier audio est vide ou n'a pas pu être capturé.", "Transcription");
            showNotification("Audio vide ou invalide.");
            return;
        }

        setIsTranscribing(true);
        if (!isAutoSavingRef.current) setAiResult('');

        try {
            let text = "";

            if (transcriptionEngine === 'whisper') {
                showNotification("Transcription locale (Whisper) en cours...");
                text = await transcribeWithWhisper(blobToUse, whisperUrl);
            } else {
                // Check if AI model is configured for Gemini transcription
                if (!aiModel) {
                    showNotification("⚠️ Veuillez configurer un modèle Gemini dans les paramètres");
                    setShowSettings(true);
                    setIsTranscribing(false);
                    return;
                }

                showNotification("Transcription cloud (Gemini) en cours...");

                // Convert WebM to WAV for Gemini compatibility if needed
                let processedBlob = blobToUse;
                // Skip silence trimming for large files (> 20MB) to avoid memory crashes
                if (blobToUse.type.includes('webm') && blobToUse.size < 20 * 1024 * 1024) {
                    try {
                        processedBlob = await trimSilence(blobToUse);
                    } catch (e) {
                        console.error("Audio conversion failed, trying raw:", e);
                        logError(e, "Audio Conversion");
                        // Continue with original blob if conversion fails
                    }
                } else if (blobToUse.size >= 20 * 1024 * 1024) {
                    console.log("[Transcription] Fichier volumineux détecté, saut du traitement du silence pour économiser la mémoire.");
                }

                const audioPart = await fileToGenerativePart(processedBlob);
                const prompt = "Transcribe the following audio exactly as spoken. Output only the transcription, no introductory text.";

                const response = await callGemini(aiModel || 'gemini-2.5-flash-preview-05-20', [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt },
                            audioPart
                        ]
                    }
                ]);

                // Track tokens
                if (response.usageMetadata) {
                    const m = response.usageMetadata;
                    setTokenUsage(prev => ({
                        lastPrompt: m.promptTokenCount,
                        lastResponse: m.candidatesTokenCount,
                        totalSession: prev.totalSession + m.totalTokenCount
                    }));
                }

                text = extractTextFromResponse(response);
            }

            if (text) {
                setTranscript(text);

                if (autoAnalyze) {
                    showNotification("Transcription terminée ! Analyse IA en cours...");
                    await processWithAI(text);
                } else {
                    showNotification("Transcription terminée !");
                    if (isAutoSavingRef.current) {
                        finalizeAutoSave(null);
                    }
                }
            }
        } catch (error) {
            console.error("Transcription Error Detail:", error);
            const blobInfo = blobToUse ? `[${blobToUse.type}, ${blobToUse.size} octets]` : "[Pas de blob]";
            logError(`${error.message} ${blobInfo}`, "Transcription");

            let userMsg = "Erreur de transcription : " + error.message;
            if (error.message.includes('inlineData')) {
                userMsg = "L'IA n'a pas reçu de données audio valides. Réessayez l'enregistrement.";
            } else if (error.message.includes('base64')) {
                userMsg = "Échec technique de conversion audio. Essayez un autre fichier ou navigateur.";
            }

            showNotification(userMsg);
            if (isAutoSavingRef.current) {
                finalizeAutoSave(null);
            }
        } finally {
            setIsTranscribing(false);
            if (!isAutoSavingRef.current) setIsProcessingAI(false);
        }
    };

    // Real Google Gemini AI Processing (using new @google/genai SDK)
    // Refactored to accept optional text input for chaining
    const processWithAI = async (textOverride = null) => {
        // Prevent event propagation if called via onClick
        if (textOverride && textOverride.stopPropagation) {
            textOverride.stopPropagation();
            textOverride.preventDefault();
        }

        // Check if AI model is configured
        if (!aiModel) {
            showNotification("⚠️ Veuillez configurer un modèle Gemini dans les paramètres");
            setShowSettings(true);
            return;
        }

        const textToAnalyze = (typeof textOverride === 'string' ? textOverride : null) || transcript;
        if (!textToAnalyze) {
            if (isAutoSavingRef.current) logError("Auto-Save: Pas de texte à analyser.");
            return;
        }

        setIsProcessingAI(true);
        setAiResult('');

        try {
            // Sanitize instructions to prevent prompt injection
            const sanitizedInstructions = sanitizeInput(aiInstructions);
            const sanitizedText = sanitizeInput(textToAnalyze);
            
            const prompt = `
Instructions de l'utilisateur : ${sanitizedInstructions}

IMPORTANT : Ne jamais ajouter de texte introductif comme "Voici le texte corrigé" ou "Résultat :". Renvoie UNIQUEMENT le contenu demandé.

Texte à analyser :
"${sanitizedText}"
            `;

            const response = await callGemini(aiModel, [
                { role: 'user', parts: [{ text: prompt }] }
            ]);

            // Track tokens
            if (response.usageMetadata) {
                const m = response.usageMetadata;
                setTokenUsage(prev => ({
                    lastPrompt: m.promptTokenCount,
                    lastResponse: m.candidatesTokenCount,
                    totalSession: prev.totalSession + m.totalTokenCount
                }));
            }

            const text = extractTextFromResponse(response);

            if (!text) {
                // console.log("Full response object:", response); // Removed to cleaner logs
                throw new Error("Réponse vide de l'IA ou bloquée par les filtres de sécurité.");
            }

            setAiResult(text);

            // Check if this was part of an Auto-Save chain
            if (isAutoSavingRef.current) {
                finalizeAutoSave(text);
            }

        } catch (error) {
            logError(error, "Analyse IA");
            setAiResult(`Erreur lors de l'analyse IA : ${error.message || "Erreur inconnue"}`);
            // If failed, still try to save what we have
            if (isAutoSavingRef.current) {
                finalizeAutoSave(null);
            }
        } finally {
            setIsProcessingAI(false);
        }
    };

    const finalizeAutoSave = (_aiText) => {
        setTimeout(() => {
            downloadPDF(); // Save PDF (now has columns!)
            downloadTranscript();
            downloadAudio();
            if (errorLogsRef.current.length > 0) downloadErrorLog();

            setShowSuccessModal(true); // Trigger Success Popup
            isAutoSavingRef.current = false; // Reset flag
        }, 500);
    };

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setIsSupported(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;

        // Removed invalid useRef call here

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let currentInterimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPiece = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcriptPiece + ' ';
                } else {
                    currentInterimTranscript += transcriptPiece;
                }
            }

            if (finalTranscript) {
                setTranscript(prev => prev + finalTranscript);
                // Force update interim when final is received to ensure sync/clearing
                setInterimTranscript(currentInterimTranscript);
                lastInterimUpdateRef.current = Date.now();
            } else {
                // Throttle interim updates to ~200ms (5fps) to prevent layout thrashing
                const now = Date.now();
                if (now - lastInterimUpdateRef.current > 200) {
                    setInterimTranscript(currentInterimTranscript);
                    lastInterimUpdateRef.current = now;
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('Erreur de reconnaissance:', event.error);
            if (event.error === 'no-speech') {
                return; // Ignore, will auto-restart
            }
            if (event.error === 'network') {
                showNotification("Erreur réseau. Tentative de reconnexion...");
                // Do NOT stops recording here. Let onend restart it.
                return;
            } else if (event.error === 'not-allowed') {
                showNotification("Accès au micro refusé.");
            } else if (event.error === 'service-not-allowed') {
                showNotification("Service de reconnaissance vocal indisponible.");
            } else {
                showNotification(`Erreur: ${event.error}`);
            }

            // For fatal errors (not-allowed, etc), stop.
            // Network errors returned early above, so they stay "listening"
            if (isListeningRef.current) {
                stopRecording();
            }
        };

        recognition.onend = () => {
            // Only restart if we are technically still "listening" state-wise (via Ref)
            // and we didn't explicitly stop due to command
            if (isListeningRef.current) {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Failed to restart recognition:", e);
                }
            }
        };

        recognitionRef.current = recognition;

        const saved = localStorage.getItem('transcripts');
        if (saved) {
            setSavedTranscripts(JSON.parse(saved));
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            stopMediaTracks();
        };
    }, [language]); // Removed isListening dependency

    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = language;
        }
    }, [language]);

    // Debounced values for translation
    const debouncedTranscript = useDebounce(transcript, 1000);
    const debouncedInterimTranscript = useDebounce(interimTranscript, 800);

    // Timer Logic
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        let interval;
        if (isListening) {
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        }
        // Duration is NOT reset to 0 here so it persists in the UI after stopping
        return () => clearInterval(interval);
    }, [isListening]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Real-time translation effect (Debounced)
    useEffect(() => {
        if (!enableTranslation) {
            setTranslatedTranscript('');
            return;
        }
        // Check if AI model is configured for translation
        if (!aiModel) {
            setTranslatedTranscript('');
            return;
        }

        const fullText = (debouncedTranscript + debouncedInterimTranscript).trim();
        if (fullText) {
            const runTranslation = async () => {
                const result = await translateWithGemini(fullText, language, targetLanguage, aiModel);
                setTranslatedTranscript(result);
            };
            runTranslation();
        } else {
            setTranslatedTranscript('');
        }
    }, [debouncedTranscript, debouncedInterimTranscript, targetLanguage, language, enableTranslation, aiModel]);



    const stopMediaTracks = () => {
        streamsRef.current.forEach(stream => {
            stream.getTracks().forEach(track => track.stop());
        });
        streamsRef.current = [];
    };

    const detectSilence = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        // Calculate average volume
        const array = dataArrayRef.current;
        let values = 0;
        const length = array.length;
        for (let i = 0; i < length; i++) {
            values += array[i];
        }
        const average = values / length;

        // Update volume meter state
        setVolumeLevel(average);

        // Threshold for silence (adjustable, 10 is usually very quiet)
        // Only run auto-stop logic if enabled
        if (autoStopSilence) {
            if (average < 10) {
                if (!silenceStartRef.current) {
                    silenceStartRef.current = Date.now();
                } else {
                    const silencedDuration = Date.now() - silenceStartRef.current;
                    const remaining = Math.max(0, 15 - Math.floor(silencedDuration / 1000));
                    setSilenceCountdown(remaining);

                    if (silencedDuration > 15000) { // 15 seconds
                        // Silence detected for 15s
                        // Stop detection loop
                        cancelAnimationFrame(animationFrameRef.current);

                        showNotification("Silence détecté (15s). Arrêt et sauvegarde...");
                        stopRecording(true); // Trigger auto-save
                        setSilenceCountdown(15);
                        return;
                    }
                }
            } else {
                // Reset silence timer if noise detected
                silenceStartRef.current = null;
                setSilenceCountdown(15);
            }
        }

        if (isListeningRef.current) {
            animationFrameRef.current = requestAnimationFrame(detectSilence);
        }
    };

    const startRecording = async () => {
        try {
            // 1. Start Speech Recognition ONLY if in 'live' mode
            if (transcriptionMode === 'live') {
                try {
                    recognitionRef.current.start();
                } catch (e) { /* ignore already started */ }
            }

            setDuration(0); // Reset timer at start of recording
            setIsListening(true);
            isListeningRef.current = true; // Sync Ref
            setAudioBlob(null);
            audioChunksRef.current = [];
            isAutoSavingRef.current = false; // Reset auto-save flag

            // 2. Setup Audio Recording (Mic + System)
            const streams = [];
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = audioContext;

            const dest = audioContext.createMediaStreamDestination();

            // Mic Stream (Always needed for recording voice)
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(dest);
            streams.push(micStream);

            // System Audio Stream (Optional)
            if (enableSystemAudio) {
                try {
                    const sysStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                    const sysSource = audioContext.createMediaStreamSource(sysStream);
                    sysSource.connect(dest);
                    streams.push(sysStream);
                } catch (err) {
                    console.warn("System audio selection cancelled or failed:", err);
                    logError("Audio système refusé/annulé.");
                    alert("Capture audio système annulée. Seul le microphone sera enregistré.");
                }
            }

            streamsRef.current = streams;

            // Audio Analysis Setup (Always setup for volume meter)
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            micSource.connect(analyser); // Connect mic to analyser
            analyserRef.current = analyser;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
            silenceStartRef.current = null;
            setVolumeLevel(0); // Reset volume level

            detectSilence(); // Start loop for volume and silence detection

            // 3. Create MediaRecorder with mixed stream
            const recorder = new MediaRecorder(dest.stream);
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);

                // Cleanup Utils
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                if (audioContextRef.current) audioContextRef.current.close();

                // Trigger Chain if AutoSaving
                if (isAutoSavingRef.current) {
                    // ALWAYS use high-accuracy transcription for auto-save
                    transcribePostProcess(blob);
                }
            };

            recorder.start();
            mediaRecorderRef.current = recorder;

        } catch (err) {
            logError(err, "Microphone");
            setIsListening(false);
            isListeningRef.current = false;
            alert("Erreur microphone/audio : " + (err.message || err));
        }
    };

    const stopRecording = (autoSave = false) => {
        if (autoSave) {
            isAutoSavingRef.current = true;
        }

        // Manual Stop Logic for Live Auto-Analyze
        if (!autoSave && transcriptionMode === 'live' && autoAnalyzeRef.current) {
            showNotification("Arrêt : Analyse IA automatique dans 1s...");
            // Wait for potential final recognition results
            setTimeout(() => {
                const finalTranscript = transcriptRef.current;
                if (finalTranscript && finalTranscript.trim()) {
                    processWithAI(finalTranscript);
                } else {
                    showNotification("Pas de texte à analyser.");
                }
            }, 1000);
        }

        // Stop recognition if it was running (live mode) or force stop just in case
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) { /* ignore if not running */ }
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop(); // This triggers onstop -> handles autoSave logic
        } else {
            // If media recorder failed or wasn't running but we need to stop?
            // Should not happen if isListening was true.
            setIsListening(false);
            isListeningRef.current = false;
        }

        stopMediaTracks();
        setIsListening(false);
        isListeningRef.current = false; // Sync Ref
    };

    const toggleListening = () => {
        if (!isListening) {
            // Reset uploaded file if we start recording
            setUploadedFile(null);
            startRecording();
        } else {
            stopRecording();
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!validateFileType(file)) {
            logError(`Fichier non reconnu (${sanitizeInput(file.type)}). Veuillez sélectionner un fichier audio valide.`);
            return;
        }

        clearTranscript();
        setUploadedFile(file);
        setAudioBlob(file); // Set audioBlob so the player and Gemini can use it
        showNotification(`Fichier "${sanitizeInput(file.name)}" chargé`);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const resetTokenUsage = () => {
        setTokenUsage({ lastPrompt: 0, lastResponse: 0, totalSession: 0 });
        showNotification("Compteur de tokens réinitialisé.");
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (!file) return;

        // Validate file type
        if (!validateFileType(file)) {
            logError(`Fichier non reconnu (${sanitizeInput(file.type)}). Veuillez déposez un fichier audio valide.`);
            return;
        }

        clearTranscript();
        setUploadedFile(file);
        setAudioBlob(file); // Set audioBlob so the player and Gemini can use it
        showNotification(`Fichier "${sanitizeInput(file.name)}" déposé`);
    };


    const downloadTranscript = () => {
        const textToSave = transcriptRef.current;
        if (!textToSave) {
            showNotification("Pas de texte à sauvegarder.");
            return;
        }
        const element = document.createElement('a');
        const file = new Blob([textToSave], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        const sanitizedFilename = sanitizeFilename(customFilename.trim());
        const fileName = sanitizedFilename
            ? `${sanitizedFilename}.txt`
            : `transcription-${new Date().toISOString().slice(0, 10)}.txt`;
        element.download = fileName;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const downloadAudio = () => {
        const blob = audioBlobRef.current;
        if (!blob) {
            console.warn("downloadAudio: No blob in Ref");
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const sanitizedFilename = sanitizeFilename(customFilename.trim());
        const fileName = sanitizedFilename
            ? `${sanitizedFilename}.webm`
            : `recording-${new Date().toISOString().slice(0, 10)}.webm`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showNotification("Fichier Audio téléchargé !");
    };


    const downloadPDF = () => {
        const doc = generatePDF({
            transcript: transcriptRef.current,
            aiResult: aiResultRef.current,
            translatedTranscript: translatedTranscriptRef.current,
            enableTranslation,
            targetLanguage,
            pdfJustify,
            customFilename: sanitizeFilename(customFilename.trim())
        });

        if (doc) {
            const sanitizedFilename = sanitizeFilename(customFilename.trim());
            const fileName = sanitizedFilename
                ? `${sanitizedFilename}.pdf`
                : `transcription-${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(fileName);
            showNotification("Fichier PDF téléchargé !");
            setHasDownloadedPDF(true);
        }
    };

    const handleDownloadDOCX = async () => {
        await downloadDOCX({
            transcript: transcriptRef.current,
            aiResult: aiResultRef.current,
            translatedTranscript: translatedTranscriptRef.current,
            enableTranslation,
            targetLanguage,
            aiModel,
            pdfJustify,
            customFilename: sanitizeFilename(customFilename.trim())
        });
        showNotification("Fichier Word téléchargé !");
    };

    const openEmailModal = () => {
        const text = aiResultRef.current || transcriptRef.current;
        if (!text) {
            showNotification("Rien à envoyer.");
            return;
        }
        setEmailSubject(`Ma Transcription - ${new Date().toLocaleDateString()}`);
        setHasDownloadedPDF(false);
        setShowEmailModal(true);
    };

    const sendEmail = () => {
        // Sanitize inputs before using in mailto link
        const sanitizedSubject = sanitizeInput(emailSubject);
        const sanitizedRecipient = sanitizeInput(emailRecipient);
        const text = aiResultRef.current || transcriptRef.current;
        const subject = encodeURIComponent(sanitizedSubject);
        const body = encodeURIComponent(text);
        const recipient = encodeURIComponent(sanitizedRecipient);

        window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
        setShowEmailModal(false);
        showNotification("Ouverture de votre messagerie...");
    };

    const saveTranscript = () => {
        if (!transcript.trim()) return;

        const newTranscript = {
            id: Date.now(),
            text: transcript,
            translatedText: translatedTranscript,
            date: new Date().toISOString(),
            language: language,
            targetLanguage: targetLanguage
        };

        const updated = [newTranscript, ...savedTranscripts];
        setSavedTranscripts(updated);
        localStorage.setItem('transcripts', JSON.stringify(updated));
        showNotification("Transcription sauvegardée dans l'historique !");
    };

    const loadTranscript = (saved) => {
        setTranscript(saved.text);
        setLanguage(saved.language);
        if (saved.translatedText) {
            setTranslatedTranscript(saved.translatedText);
        }
        if (saved.targetLanguage) {
            setTargetLanguage(saved.targetLanguage);
        }
    };

    const deleteTranscript = (id) => {
        const updated = savedTranscripts.filter(t => t.id !== id);
        setSavedTranscripts(updated);
        localStorage.setItem('transcripts', JSON.stringify(updated));
    };

    const clearTranscript = () => {
        setTranscript('');
        setTranslatedTranscript('');
        setAudioBlob(null);
        setAiResult('');
    };

    const languages = useMemo(() => [
        { code: 'fr-FR', name: '🇫🇷 Français', countryCode: 'fr' },
        { code: 'en-US', name: '🇺🇸 English', countryCode: 'us' },
        { code: 'es-ES', name: '🇪🇸 Español', countryCode: 'es' },
        { code: 'de-DE', name: '🇩🇪 Deutsch', countryCode: 'de' },
        { code: 'it-IT', name: '🇮🇹 Italiano', countryCode: 'it' },
        { code: 'ar-SA', name: '🇸🇦 العربية', countryCode: 'sa' }
    ], []);

    if (!isSupported) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <MicOff className="w-16 h-16 mx-auto mb-4 text-red-500" />
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Navigateur non supporté</h2>
                    <p className="text-gray-600">
                        Votre navigateur ne supporte pas la reconnaissance vocale.
                        Veuillez utiliser Chrome, Edge ou Safari pour utiliser cette application.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-500 p-4 md:p-8 text-gray-900 dark:text-gray-100">
            <div className="max-w-6xl mx-auto">
                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 md:p-8 mb-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                    {/* Notification Toast - Integrated near title */}
                    {notification && (
                        <div className="absolute top-4 left-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 border border-purple-500/30">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-semibold tracking-wide uppercase">{notification}</span>
                            </div>
                        </div>
                    )}

                    {/* Missing Model Warning */}
                    {!aiModel && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex-shrink-0">
                                <Settings className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Configuration requise</h3>
                                <p className="text-xs text-red-700 dark:text-red-400">
                                    Veuillez configurer un modèle Gemini dans les paramètres pour utiliser l'IA.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Ouvrir les paramètres
                            </button>
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-12 w-full sm:w-auto">
                            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-white flex items-center gap-2 sm:gap-3">
                                <Mic className="w-5 h-5 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-500" />
                                <span className="truncate max-w-[150px] sm:max-w-none">Speach-to-Text</span>
                            </h1>
                        </div>
                        <img
                            src={darkMode ? "/Encounter_long_light.webp" : "/Encounter_long_dark.webp"}
                            alt="Encounter Logo"
                            className="absolute left-1/2 -translate-x-1/2 top-1 sm:top-4 md:top-6 h-4 sm:h-8 md:h-10 z-20 pointer-events-none opacity-80 sm:opacity-100"
                        />
                        <div className="flex gap-2 self-end sm:self-auto">
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                title={darkMode ? "Mode Clair" : "Mode Sombre"}
                            >
                                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                title="Paramètres de l'Agent IA"
                            >
                                <Settings className="w-6 h-6" />
                            </button>
                            <TokenCounter tokenUsage={tokenUsage} onReset={resetTokenUsage} />
                        </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">Transcription et traduction en temps réel</p>

                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            {/* Translation Toggle - Now integrated in the same row */}
                            <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm transition-colors h-[46px] sm:h-[50px]">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className={`text-sm font-medium whitespace-nowrap ${enableTranslation ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        Traduction
                                    </span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={enableTranslation}
                                            onChange={(e) => setEnableTranslation(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </div>
                                </label>
                            </div>

                            {/* Transcription Engine Selector */}
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg self-start sm:self-auto h-[46px] sm:h-[50px]">
                                <button
                                    onClick={() => !isListening && setTranscriptionEngine('google')}
                                    disabled={isListening}
                                    title="Utilise l'IA Cloud Gemini de Google"
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${transcriptionEngine === 'google'
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Gemini (Cloud)
                                </button>
                                <button
                                    onClick={() => !isListening && setTranscriptionEngine('whisper')}
                                    disabled={isListening}
                                    title="Utilise Whisper en local (nécessite le serveur python lancé)"
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${transcriptionEngine === 'whisper'
                                        ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-300 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Whisper (Local)
                                </button>
                            </div>

                            <LanguageSelector
                                value={language}
                                onChange={setLanguage}
                                languages={languages.filter(l => l.code !== targetLanguage)}
                                disabled={isListening}
                            />

                            {enableTranslation && (
                                <>
                                    <div className="hidden sm:flex items-center justify-center text-gray-400 px-1">
                                        <Languages className="w-5 h-5" />
                                    </div>

                                    <LanguageSelector
                                        value={targetLanguage}
                                        onChange={setTargetLanguage}
                                        languages={languages.filter(l => l.code !== language)}
                                        className="flex-1 w-full sm:w-auto"
                                    />
                                </>
                            )}
                        </div>

                        {/* Drag & Drop Zone - Own Row */}
                        <div className="w-full mb-4">
                            <div
                                className={`w-full p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${isDragging
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 bg-gray-50/50 dark:bg-gray-800/50'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="audio/*"
                                    className="hidden"
                                />
                                {uploadedFile ? (
                                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 w-full justify-center">
                                        <FileAudio className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm font-medium break-all text-center">{uploadedFile.name}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setAudioBlob(null); }}
                                            className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-full flex-shrink-0"
                                            title="Supprimer le fichier"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                            <Download className="w-5 h-5 text-purple-400" />
                                            <span>Glissez un fichier audio ou <strong>cliquez ici</strong></span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">MP3, WAV, WebM supportés</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center justify-between w-full">
                            {/* Mode Toggle */}
                            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg self-start sm:self-auto">
                                <button
                                    onClick={() => !isListening && setTranscriptionMode('live')}
                                    disabled={isListening}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${transcriptionMode === 'live'
                                        ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-300 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Live (Rapide)
                                </button>
                                <button
                                    onClick={() => !isListening && setTranscriptionMode('post')}
                                    disabled={isListening}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${transcriptionMode === 'post'
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Post (Précis)
                                </button>
                            </div>

                            <button
                                onClick={() => setEnableSystemAudio(!enableSystemAudio)}
                                disabled={isListening}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border ${enableSystemAudio
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <Speaker className="w-4 h-4" />
                                <span className="hidden sm:inline">{enableSystemAudio ? 'Audio système activé' : 'Audio système désactivé'}</span>
                                <span className="sm:hidden">{enableSystemAudio ? 'Audio activé' : 'Audio désactivé'}</span>
                            </button>

                            {/* Auto Stop Silence Toggle */}
                            <button
                                onClick={() => setAutoStopSilence(!autoStopSilence)}
                                disabled={isListening}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border ${autoStopSilence
                                    ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title="Arrêter automatiquement après 15s de silence et sauvegarder"
                            >
                                <div className={`w-3 h-3 rounded-full ${autoStopSilence ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                                <span className="hidden sm:inline">Arrêt auto ({silenceCountdown}s)</span>
                                <span className="sm:hidden">{silenceCountdown}s</span>
                            </button>

                            <button
                                onClick={toggleListening}
                                disabled={!!uploadedFile}
                                title={uploadedFile ? "Impossible d'enregistrer avec un fichier chargé. Supprimez d'abord le fichier." : "Commencer l'enregistrement"}
                                className={`px-6 sm:px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center gap-2 justify-center flex-1 sm:flex-initial ${isListening
                                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                    : uploadedFile
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-purple-600 hover:bg-purple-700'
                                    } ${uploadedFile ? 'opacity-50' : ''}`}
                            >
                                {isListening ? (
                                    <>
                                        <MicOff className="w-5 h-5" />
                                        Arrêter ({formatDuration(duration)})
                                    </>
                                ) : (
                                    <>
                                        <Mic className="w-5 h-5" />
                                        Commencer
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Audio Level Meter */}
                        <AudioLevelMeter isListening={isListening} volumeLevel={volumeLevel} />
                    </div>

                    {/* Post-Processing Transcription Trigger */}
                    {!isListening && audioBlob && transcriptionMode === 'post' && (
                        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
                            <div>
                                <h3 className="font-semibold text-blue-800 dark:text-blue-300">
                                    {uploadedFile ? "Fichier prêt" : "Prêt à transcrire ?"}
                                </h3>
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                    {uploadedFile
                                        ? `Fichier "${uploadedFile.name}" chargé.`
                                        : `Audio enregistré (${formatDuration(duration)}).`}
                                    Utilisez l'IA pour une précision maximale.
                                </p>
                            </div>
                            <button
                                onClick={transcribePostProcess}
                                disabled={isProcessingAI}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-colors flex items-center gap-2"
                            >
                                {isProcessingAI ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        Traitement...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                                        Transcrire maintenant
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Control Row: Shared Actions */}
                    <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            {transcriptionMode === 'post' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="autoAnalyze"
                                        checked={autoAnalyze}
                                        onChange={(e) => setAutoAnalyze(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <label htmlFor="autoAnalyze" className="text-sm font-medium text-gray-900 dark:text-gray-300">
                                        Analyse automatique
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {!isListening && transcript && (
                                <button
                                    onClick={processWithAI}
                                    disabled={isProcessingAI}
                                    className="p-2 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-purple-500 hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={isProcessingAI ? 'Analyse en cours...' : 'Analyser avec l\'IA'}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{isProcessingAI ? 'Analyse...' : 'Analyser avec l\'IA'}</span>
                                </button>
                            )}
                            <button
                                onClick={() => copyToClipboard(transcript)}
                                className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1.5"
                                title="Copier la transcription"
                            >
                                <Copy className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Copier</span>
                            </button>
                            <button
                                onClick={() => handleSpeak(transcript, 'transcript', language)}
                                className={`p-2 rounded-lg shadow-sm border font-semibold transition-all flex items-center gap-1.5 ${speakingSection === 'transcript'
                                    ? 'bg-purple-600 text-white border-purple-500 animate-pulse'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-purple-500 hover:text-white'
                                    }`}
                                title={speakingSection === 'transcript' ? "Arrêter la lecture" : "Lire la transcription"}
                            >
                                {speakingSection === 'transcript' ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider">Lire</span>
                            </button>
                        </div>
                    </div>

                    <div className={`grid grid-cols-1 ${enableTranslation ? 'md:grid-cols-2' : ''} gap-4 mb-4`}>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <span>Transcription Originale</span>
                                    {isListening && <span className="text-red-500 animate-pulse text-[10px]">● Enregistrement</span>}
                                </h2>
                            </div>
                            <div
                                ref={transcriptContainerRef}
                                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 min-h-[80px] h-auto border border-gray-100 dark:border-gray-700 relative transition-all duration-300 ${isListening ? `ring-2 ring-purple-100 dark:ring-purple-900 h-64 ${(transcript || interimTranscript) ? 'overflow-y-auto' : 'overflow-hidden'}` : ''}`}
                            >
                                {isListening && (
                                    <div className="flex items-center gap-2 mb-4 text-red-500 sticky top-0 bg-gray-50 pb-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-medium">
                                            Écoute en cours
                                            {enableSystemAudio && ' (+ Audio Système)'}
                                            ...
                                        </span>
                                    </div>
                                )}
                                <div className="flex-1 flex flex-col">
                                    {isTranscribing ? (
                                        <div className="flex items-center gap-2 text-purple-400 italic py-2">
                                            <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                                            Transcription en cours...
                                        </div>
                                    ) : isListening ? (
                                        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-sans text-base">
                                            {!transcript && !interimTranscript && <span className="text-gray-400 italic">Le texte apparaîtra ici...</span>}
                                            {transcript}
                                            {interimTranscript && <span className="text-gray-400">{interimTranscript}</span>}
                                        </div>
                                    ) : (
                                        <textarea
                                            ref={transcriptTextareaRef}
                                            className={`w-full bg-gray-50/50 dark:bg-gray-900/30 p-3 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-700 dark:text-gray-300 leading-relaxed font-sans text-base transition-all max-h-[260px] ${transcript ? 'overflow-y-auto' : 'overflow-hidden'}`}
                                            value={transcript}
                                            onChange={(e) => setTranscript(e.target.value)}
                                            placeholder="Le texte apparaîtra ici..."
                                            rows={1}
                                        />
                                    )}
                                </div>

                                {/* Scroll Anchor */}
                                <div ref={transcriptEndRef} />
                            </div>
                        </div>

                        {enableTranslation && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                        <span>Traduction instantanée ({targetLanguage})</span>
                                    </h2>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => copyToClipboard(translatedTranscript)}
                                            className="p-1 px-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1"
                                            title="Copier la traduction"
                                        >
                                            <Copy className="w-4 h-4" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Copier</span>
                                        </button>
                                        <button
                                            onClick={() => handleSpeak(translatedTranscript, 'translation', targetLanguage)}
                                            className={`p-1 px-2 rounded shadow-sm border font-semibold transition-all flex items-center gap-1 ${speakingSection === 'translation'
                                                ? 'bg-purple-600 text-white border-purple-500 animate-pulse'
                                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-purple-500 hover:text-white'
                                                }`}
                                            title={speakingSection === 'translation' ? "Arrêter la lecture" : "Lire la traduction"}
                                        >
                                            {speakingSection === 'translation' ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Lire</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 min-h-[80px] h-auto border border-gray-100 dark:border-gray-700 relative transition-all duration-300">
                                    <div
                                        ref={translationAreaRef}
                                        className={`text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-sans text-base max-h-[260px] ${translatedTranscript ? 'overflow-y-auto' : 'overflow-hidden'}`}
                                    >
                                        {translatedTranscript || <span className="text-gray-400 italic">La traduction apparaîtra ici...</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI Control Row: Title & Actions */}
                    <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bot text-purple-600 dark:text-purple-400"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
                                <span className="text-purple-600 dark:text-purple-400">Résultat de l'Agent IA</span>
                            </h3>

                            {/* Integrated Token Counter */}
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
                                    onClick={resetTokenUsage}
                                    className="text-[10px] text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1 ml-1"
                                    title="Réinitialiser le compteur de session"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => copyToClipboard(aiResult)}
                                className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1.5"
                                title="Copier le résultat"
                            >
                                <Copy className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Copier</span>
                            </button>
                            <button
                                onClick={() => handleSpeak(aiResult, 'ai', language)}
                                className={`p-2 rounded-lg shadow-sm border font-semibold transition-all flex items-center gap-1.5 ${speakingSection === 'ai'
                                    ? 'bg-purple-600 text-white border-purple-500 animate-pulse'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-purple-500 hover:text-white'
                                    }`}
                                title={speakingSection === 'ai' ? "Arrêter la lecture" : "Lire le résultat"}
                            >
                                {speakingSection === 'ai' ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}
                                <span className="text-[10px] font-bold uppercase tracking-wider">Lire</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 min-h-[80px] h-auto border border-gray-100 dark:border-gray-700 relative mb-4 transition-all duration-300">
                        {isRateLimited && (
                            <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex-shrink-0">
                                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Limite API atteinte</h4>
                                    <p className="text-xs text-amber-700 dark:text-amber-400">
                                        Trop de requêtes. Nouvelle tentative dans <span className="font-mono font-bold text-base ml-1">{retryDelay}s</span>...
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="w-1 h-1 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {isProcessingAI ? (
                            <div className="flex items-center gap-2 text-purple-400 italic">
                                <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                                Analyse en cours...
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                {!aiResult ? (
                                    <span className="text-purple-300 dark:text-purple-500/50 italic">Cliquez sur "Analyser avec IA" pour voir le résultat...</span>
                                ) : (
                                    <textarea
                                        ref={aiTextareaRef}
                                        value={aiResult}
                                        onChange={(e) => setAiResult(e.target.value)}
                                        className={`w-full bg-white/50 dark:bg-gray-800/50 p-3 border border-purple-200/50 dark:border-purple-800/50 rounded-lg resize-none focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-mono text-sm transition-all max-h-[260px] ${aiResult ? 'overflow-y-auto' : 'overflow-hidden'}`}
                                        placeholder="Le résultat s'affichera ici..."
                                        rows={1}
                                    />
                                )}
                            </div>
                        )}


                    </div>

                    <div className="mb-6 flex flex-col sm:flex-row items-end gap-4 bg-gray-50/50 dark:bg-gray-900/20 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex-1 w-full">
                            <label htmlFor="customFilename" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Nom du fichier (optionnel)
                            </label>
                            <div className="relative">
                                <input
                                    id="customFilename"
                                    type="text"
                                    value={customFilename}
                                    onChange={(e) => setCustomFilename(e.target.value)}
                                    placeholder="Ex: transcription_reunion_01"
                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-700 dark:text-gray-300 transition-all text-sm shadow-sm"
                                />
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                {customFilename && (
                                    <button
                                        onClick={() => setCustomFilename('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                    >
                                        <X className="w-3 h-3 text-gray-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <button
                            onClick={() => copyToClipboard(transcript)}
                            disabled={!transcript}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                        >
                            <Copy className="w-4 h-4" />
                            Copier
                        </button>
                        <button
                            onClick={downloadTranscript}
                            disabled={!transcript}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                        >
                            <Download className="w-4 h-4" />
                            Texte
                        </button>
                        <button
                            onClick={downloadPDF}
                            disabled={!transcript && !aiResult}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                        >
                            <Download className="w-4 h-4" />
                            PDF
                        </button>
                        <button
                            onClick={handleDownloadDOCX}
                            disabled={!transcript && !aiResult}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                        >
                            <FileBadge className="w-4 h-4" />
                            Word
                        </button>
                        <button
                            onClick={downloadAudio}
                            disabled={!audioBlob}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                        >
                            <Download className="w-4 h-4" />
                            Audio
                        </button>
                        <button
                            onClick={openEmailModal}
                            disabled={!transcript && !aiResult}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 text-sm sm:text-base"
                        >
                            <Mail className="w-4 h-4" />
                            Email
                        </button>
                        <button
                            onClick={saveTranscript}
                            disabled={!transcript}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Sauvegarde Historique
                        </button>
                        <button
                            onClick={clearTranscript}
                            disabled={!transcript && !audioBlob}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                        >
                            <Trash2 className="w-4 h-4" />
                            Effacer
                        </button>
                        {errorLogs.length > 0 && (
                            <button
                                onClick={downloadErrorLog}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                                Logs d'erreur ({errorLogs.length})
                            </button>
                        )}
                    </div>

                    {/* Audio Player for Verification */}
                    {audioBlob && (
                        <div className="mt-6 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Speaker className="w-4 h-4" />
                                Vérification Audio
                            </h3>
                            <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                        </div>
                    )}
                </div>

                {savedTranscripts.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 md:p-8 transition-colors duration-300">
                        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-500" />
                            Historique
                        </h2>
                        <div className="space-y-3">
                            {savedTranscripts.map(saved => (
                                <div key={saved.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/30 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(saved.date).toLocaleString('fr-FR')}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => loadTranscript(saved)}
                                                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                                            >
                                                Charger
                                            </button>
                                            <button
                                                onClick={() => deleteTranscript(saved.id)}
                                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 line-clamp-1 mb-1"><strong>Org:</strong> {saved.text}</p>
                                    <p className="text-blue-600 dark:text-blue-400 line-clamp-1"><strong>Tr ({saved.targetLanguage}):</strong> {saved.translatedText}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <SettingsModal
                show={showSettings}
                onClose={() => setShowSettings(false)}
                aiModel={aiModel}
                setAiModel={setAiModel}
                aiInstructions={aiInstructions}
                setAiInstructions={setAiInstructions}
                pdfJustify={pdfJustify}
                setPdfJustify={setPdfJustify}
                transcriptionEngine={transcriptionEngine}
                setTranscriptionEngine={setTranscriptionEngine}
                whisperUrl={whisperUrl}
                setWhisperUrl={setWhisperUrl}
            />

            <SuccessModal
                show={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
            />

            <EmailModal
                show={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                emailRecipient={emailRecipient}
                setEmailRecipient={setEmailRecipient}
                emailSubject={emailSubject}
                setEmailSubject={setEmailSubject}
                hasDownloadedPDF={hasDownloadedPDF}
                onDownloadPDF={downloadPDF}
                onSendEmail={sendEmail}
            />

            {/* Copyright Footer */}
            <div className="text-center mt-8 pb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Copyright Michel ESPARSA - {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Version Inconnue'}
                </p>
            </div>
        </div>
    );
}

