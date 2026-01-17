import React, { useState, useEffect, useRef } from 'react';

import { Mic, MicOff, Copy, Download, Trash2, Clock, Save, Languages, Speaker, FileAudio, FileText, Moon, Sun, Mail } from 'lucide-react';
import { jsPDF } from "jspdf";

import { GoogleGenAI } from "@google/genai";

export default function SpeechToTextApp() {
    // -----------------------------------------------------------------
    // 1. ALL STATE DECLARATIONS
    // -----------------------------------------------------------------
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [translatedTranscript, setTranslatedTranscript] = useState('');
    const [enableTranslation, setEnableTranslation] = useState(() => {
        return localStorage.getItem('enableTranslation') === 'true'; // Default false
    });
    const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'fr-FR');
    const [targetLanguage, setTargetLanguage] = useState(() => localStorage.getItem('targetLanguage') || 'en-US');
    const [savedTranscripts, setSavedTranscripts] = useState([]);
    const [isSupported, setIsSupported] = useState(true);

    // AI Agent States
    const [showSettings, setShowSettings] = useState(false);
    const [transcriptionMode, setTranscriptionMode] = useState('post'); // 'live' or 'post'
    const [autoAnalyze, setAutoAnalyze] = useState(true); // Toggle for chaining
    const [aiInstructions, setAiInstructions] = useState(() => {
        return localStorage.getItem('aiInstructions') || `Corrige ce texte en:
1)vérifiant l'orthographe,
2)supprimant les espaces manquants entre les mots,
3)supprimant les sauts de lignes inutiles,
4)supprimant les retours à la ligne inutiles,
5)supprimant les Carriage Return Line Feed et vérifie le texte
6)identifiant des paragraphes dans ce texte et met le en forme
et produit le fichier texte brut`;
    });
    const [aiModel, setAiModel] = useState(() => {
        return localStorage.getItem('aiModel') || 'gemini-2.0-flash';
    });
    const [aiResult, setAiResult] = useState('');
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [notification, setNotification] = useState(null);
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('darkMode') === 'true';
    });
    const [audioBlob, setAudioBlob] = useState(null);
    const [autoStopSilence, setAutoStopSilence] = useState(true); // Default enabled as per user request
    const [silenceCountdown, setSilenceCountdown] = useState(15);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [hasDownloadedPDF, setHasDownloadedPDF] = useState(false);
    const [emailRecipient, setEmailRecipient] = useState('');
    const [emailSubject, setEmailSubject] = useState('Transcription Encounter');
    const [errorLogs, setErrorLogs] = useState([]);

    // Audio Settings
    const [enableSystemAudio, setEnableSystemAudio] = useState(() => {
        return localStorage.getItem('enableSystemAudio') === 'true'; // Default false
    });

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

    const showNotification = (message) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000); // Hide after 3 seconds
    };

    const logError = (message) => {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        console.error(logEntry);
        setErrorLogs(prev => [...prev, logEntry]);
        showNotification("Erreur détectée (voir logs)");
    };

    const downloadErrorLog = () => {
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
    };

    // Save app settings to localStorage
    useEffect(() => {
        localStorage.setItem('aiInstructions', aiInstructions);
        localStorage.setItem('aiModel', aiModel);
        localStorage.setItem('enableTranslation', enableTranslation);
        localStorage.setItem('language', language);
        localStorage.setItem('targetLanguage', targetLanguage);
        localStorage.setItem('enableSystemAudio', enableSystemAudio);
    }, [aiInstructions, aiModel, enableTranslation, language, targetLanguage, enableSystemAudio]);

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

    // -----------------------------------------------------------------
    // 4. BUSINESS LOGIC
    // -----------------------------------------------------------------
    // Simulated Translation Map (Basic demonstration)
    const simulateTranslation = (text, targetLang) => {
        // In a real app, this would call Google Translate / DeepL API
        // For now, we simulate by appending a tag or simple reversal for demo
        if (!text) return '';
        return `[Traduction en ${targetLang}]: ${text}`;
    };

    const fileToGenerativePart = async (file) => {
        const base64EncodedDataPromise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });
        return {
            inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
        };
    };

    // Helper to safely extract text from Gemini response (handles ALL SDK versions)
    const extractTextFromResponse = (response) => {
        if (!response) return "";

        try {
            // Unary response for @google/genai (new)
            if (typeof response.text === 'string') return response.text;

            // Response object for @google/generative-ai (classic)
            if (typeof response.text === 'function') {
                const text = response.text();
                // If it's still a function or object, we need to dig deeper
                if (typeof text === 'string') return text;
            }

            // Deep Candidate extraction (Shared Logic)
            if (response.candidates && response.candidates[0]?.content?.parts) {
                const parts = response.candidates[0].content.parts;
                const text = parts.map(p => {
                    // Parts can have .text directly or nested .text.text in some weird cases
                    if (typeof p.text === 'string') return p.text;
                    if (typeof p.text === 'object' && p.text?.text) return p.text.text;
                    if (typeof p === 'string') return p;
                    return '';
                }).join('').trim();
                if (text) return text;
            }

            // Choice-based extraction (OpenAI-compatible wrappers)
            if (response.choices && response.choices[0]?.message?.content) {
                return response.choices[0].message.content;
            }

            // Recursive Search (Fallback for unknown structures) - PROTECTED to return ONLY strings
            const deepSearch = (obj, depth = 0) => {
                if (depth > 5 || !obj || typeof obj !== 'object') return null;

                // Prioritize common text keys
                const keys = ['text', 'content', 'parts', 'candidates', 'choices', 'message'];
                for (const key of keys) {
                    const val = obj[key];
                    if (typeof val === 'string' && val.trim().length > 0) return val;
                    if (typeof val === 'object') {
                        const found = deepSearch(val, depth + 1);
                        if (found) return found;
                    }
                }
                return null;
            };

            const fallbackText = deepSearch(response);
            if (typeof fallbackText === 'string') return fallbackText;

        } catch (e) {
            console.error("Extraction error:", e);
        }

        // Final fallback: log structure and return empty string (NEVER an object)
        console.warn("Gemini Response Structure Unknown:", response);
        return "";
    };

    const transcribeAudioWithGemini = async (directBlob = null) => {
        // Use directBlob if provided (from AutoSave) AND is a Blob, otherwise state blob
        // This prevents the Click Event from being treated as a Blob when called via onClick
        const blobToUse = (directBlob instanceof Blob) ? directBlob : audioBlob;

        if (!blobToUse) {
             logError("Aucun fichier audio à transcrire.");
             return;
        }

        setIsProcessingAI(true);
        if(!isAutoSavingRef.current) setAiResult('');

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
                throw new Error("Clé API manquante");
            }

            const client = new GoogleGenAI({ apiKey });

            const audioPart = await fileToGenerativePart(blobToUse);

            const prompt = "Transcribe the following audio exactly as spoken. Output only the transcription, no introductory text.";

            const response = await client.models.generateContent({
                model: 'gemini-2.0-flash', // Use Flash for speed with audio
                contents: [{ role: 'user', parts: [{ text: prompt }, audioPart] }],
            });

            const text = extractTextFromResponse(response);

            if (text) {
                setTranscript(prev => prev + (prev ? ' ' : '') + text);

                if (autoAnalyze) {
                   showNotification("Transcription audio terminée ! Analyse IA en cours...");
                   await processWithAI(text);
                } else {
                   showNotification("Transcription terminée !");
                   if (isAutoSavingRef.current) {
                        finalizeAutoSave(null);
                   }
                }
            } else {
                throw new Error("Réponse de transcription vide (structure inconnue).");
            }
        } catch (error) {
            console.error("Gemini Audio Error:", error);
            logError("Erreur Transcription Audio: " + error.message);
            showNotification("Erreur lors de la transcription audio Gemini: " + error.message);
             if (isAutoSavingRef.current) {
                 // Even if transcription fails, try to save audio/error logs
                 finalizeAutoSave(null);
            }
        } finally {
            if (!isAutoSavingRef.current) setIsProcessingAI(false); // If chaining, let processWithAI handle it
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

        const textToAnalyze = (typeof textOverride === 'string' ? textOverride : null) || transcript;
        if (!textToAnalyze) {
            if (isAutoSavingRef.current) logError("Auto-Save: Pas de texte à analyser.");
            return;
        }

        setIsProcessingAI(true);
        setAiResult('');

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
                throw new Error("Clé API Gemini manquante. Veuillez configurer VITE_GEMINI_API_KEY dans le fichier .env");
            }

            const client = new GoogleGenAI({
                apiKey: apiKey,
            });

            const prompt = `
Instructions de l'utilisateur : ${aiInstructions}

IMPORTANT : Ne jamais ajouter de texte introductif comme "Voici le texte corrigé" ou "Résultat :". Renvoie UNIQUEMENT le contenu demandé.

Texte à analyser :
"${textToAnalyze}"
            `;

            const response = await client.models.generateContent({
                model: aiModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });

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
            logError(`Erreur AI: ${error.message || error}`);
            setAiResult(`Erreur lors de l'analyse IA : ${error.message || "Erreur inconnue"}`);
            // If failed, still try to save what we have
             if (isAutoSavingRef.current) {
                 finalizeAutoSave(null);
            }
        } finally {
            setIsProcessingAI(false);
        }
    };

    const finalizeAutoSave = (aiText) => {
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

    // Custom Debounce Hook
    const useDebounce = (value, delay) => {
        const [debouncedValue, setDebouncedValue] = useState(value);
        useEffect(() => {
            const handler = setTimeout(() => {
                setDebouncedValue(value);
            }, delay);
            return () => {
                clearTimeout(handler);
            };
        }, [value, delay]);
        return debouncedValue;
    };

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
        } else {
            setDuration(0);
        }
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
        const fullText = debouncedTranscript + debouncedInterimTranscript;
        if (fullText) {
            setTranslatedTranscript(simulateTranslation(fullText, targetLanguage));
        }
    }, [debouncedTranscript, debouncedInterimTranscript, targetLanguage, enableTranslation]);



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
                } catch(e) { /* ignore already started */ }
            }

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
                    if (transcriptionMode === 'post') {
                         // Post Mode: We need to transcribe first
                         // We can't call transcribeAudioWithGemini directly easily because it reads audioBlob state which might not be set yet due to closure.
                         // But we can pass the blob explicitly or wait for state.
                         // Actually, setAudioBlob(blob) triggers re-render, but we need immediate action.
                         // Let's call a modified transcribe with the blob directly.
                         transcribeAudioWithGemini(blob);
                    } else {
                        // Live Mode: Transcript is already in state (mostly).
                        if (autoAnalyzeRef.current) {
                            showNotification("Auto-Save: Analyse IA en cours...");
                            processWithAI();
                        } else {
                             // Skip analysis, just save what we have
                             finalizeAutoSave(null);
                        }
                    }
                }
            };

            recorder.start();
            mediaRecorderRef.current = recorder;

        } catch (err) {
            logError("Erreur startRecording: " + err.message);
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
            } catch(e) { /* ignore if not running */ }
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
            startRecording();
        } else {
            stopRecording();
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(transcript);
        alert('Texte copié dans le presse-papier !');
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
        element.download = `transcription-${new Date().toISOString().slice(0, 10)}.txt`;
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
        a.download = `recording-${new Date().toISOString().slice(0, 10)}.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showNotification("Fichier Audio téléchargé !");
    };

    const generatePDF = () => {
        const currentTranscript = transcriptRef.current;
        const currentAIResult = aiResultRef.current;
        const currentTranslation = translatedTranscriptRef.current;

        if (!currentTranscript && !currentAIResult) return null;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const availableWidth = pageWidth - margin * 2;
        let yPosition = 20;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");

        if (currentAIResult) {
            // ONLY AI Result Mode
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Encounter", margin, yPosition);
            yPosition += 10;

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            const splitAI = doc.splitTextToSize(currentAIResult, availableWidth);

            for(let i=0; i<splitAI.length; i++) {
                if (yPosition > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(splitAI[i], margin, yPosition);
                yPosition += 6; // Line height for AI text
            }
        } else {
            // Transcript Mode (Original + optional Translation)
            if (enableTranslation) {
                 const colWidth = (availableWidth / 2) - 5; // Gap of 10/2 = 5

                 // Column Headers
                 doc.setFont("helvetica", "bold");
                 doc.text("Original", margin, yPosition);
                 doc.text(`Traduction (${targetLanguage})`, margin + colWidth + 10, yPosition);
                 yPosition += 7;
                 doc.setFont("helvetica", "normal");

                 const splitOriginal = doc.splitTextToSize(currentTranscript, colWidth);
                 const splitTranslation = doc.splitTextToSize(currentTranslation, colWidth);

                 const maxLines = Math.max(splitOriginal.length, splitTranslation.length);

                 for(let i=0; i<maxLines; i++) {
                     if (yPosition > pageHeight - 20) {
                         doc.addPage();
                         yPosition = 20;
                     }
                     if(splitOriginal[i]) doc.text(splitOriginal[i], margin, yPosition);
                     if(splitTranslation[i]) doc.text(splitTranslation[i], margin + colWidth + 10, yPosition);
                     yPosition += 5; // Line height
                 }
            } else {
                // Single Column
                const splitText = doc.splitTextToSize(currentTranscript, availableWidth);
                doc.text(splitText, margin, yPosition);
            }
        }

        return doc;
    };

    const downloadPDF = () => {
        const doc = generatePDF();
        if (!doc) return;
        doc.save(`export-${new Date().toISOString().slice(0, 10)}.pdf`);
        showNotification("Fichier PDF enregistré !");
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
        const text = aiResultRef.current || transcriptRef.current;
        const subject = encodeURIComponent(emailSubject);
        const body = encodeURIComponent(text);
        const recipient = encodeURIComponent(emailRecipient);

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

    const languages = [
        { code: 'fr-FR', name: '🇫🇷 Français' },
        { code: 'en-US', name: '🇺🇸 English' },
        { code: 'es-ES', name: '🇪🇸 Español' },
        { code: 'de-DE', name: '🇩🇪 Deutsch' },
        { code: 'it-IT', name: '🇮🇹 Italiano' },
        { code: 'ar-SA', name: '🇸🇦 العربية' }
    ];

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
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 md:p-8 mb-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-12 w-full sm:w-auto">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-white flex items-center gap-2 sm:gap-3">
                                <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-500" />
                                <span className="truncate">Speech-to-Text</span>
                            </h1>
                            <img
                                src={darkMode ? "/Encounter_long_light.webp" : "/Encounter_long_dark.webp"}
                                alt="Encounter Logo"
                                className="h-6 sm:h-8 md:h-10"
                            />
                        </div>
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                        </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">Transcription et traduction en temps réel</p>

                    <div className="flex flex-col gap-4 mb-6">
                        {/* Translation Toggle */}
                        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm self-start transition-colors">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <span className={`text-sm font-medium ${enableTranslation ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    Traduction
                                </span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={enableTranslation}
                                        onChange={(e) => setEnableTranslation(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                </div>
                            </label>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                disabled={isListening}
                                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-sm sm:text-base"
                            >
                                <option value="" disabled>Langue source</option>
                                {languages.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                ))}
                            </select>

{enableTranslation && (
                                <div className="hidden sm:flex items-center justify-center text-gray-400">
                                    <Languages className="w-5 h-5" />
                                </div>
                            )}

                            {enableTranslation && (
                                <select
                                    value={targetLanguage}
                                    onChange={(e) => setTargetLanguage(e.target.value)}
                                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                                >
                                    <option value="" disabled>Langue cible</option>
                                    {languages.map(lang => (
                                        <option key={`target-${lang.code}`} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between w-full">
                             {/* Mode Toggle */}
                             <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg self-start sm:self-auto">
                                <button
                                    onClick={() => !isListening && setTranscriptionMode('live')}
                                    disabled={isListening}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                        transcriptionMode === 'live'
                                            ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-300 shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Live (Rapide)
                                </button>
                                <button
                                    onClick={() => !isListening && setTranscriptionMode('post')}
                                    disabled={isListening}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                        transcriptionMode === 'post'
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
                                className={`px-6 sm:px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center gap-2 justify-center flex-1 sm:flex-initial ${isListening
                                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                                    : 'bg-purple-600 hover:bg-purple-700'
                                    }`}
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
                        {isListening && (
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
                                    {/* Create a segmented LED-style meter */}
                                    {[...Array(20)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-full flex-1 rounded-sm transition-all duration-75 ${
                                                (volumeLevel / 128) > (i / 20)
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
                        )}
                    </div>

                    {/* Post-Processing Transcription Trigger */}
                    {!isListening && audioBlob && transcriptionMode === 'post' && (
                        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
                            <div>
                                <h3 className="font-semibold text-blue-800 dark:text-blue-300">Prêt à transcrire ?</h3>
                                <p className="text-sm text-blue-600 dark:text-blue-400">Audio enregistré ({formatDuration(duration)}). Utilisez l'IA pour une précision maximale.</p>
                            </div>
                            <button
                                onClick={transcribeAudioWithGemini}
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
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                        Transcrire maintenant
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Auto-Analyze Toggle for Post Mode */}
                    {transcriptionMode === 'post' && (
                        <div className="mb-4 flex items-center gap-2">
                             <input
                                type="checkbox"
                                id="autoAnalyze"
                                checked={autoAnalyze}
                                onChange={(e) => setAutoAnalyze(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label htmlFor="autoAnalyze" className="text-sm font-medium text-gray-900 dark:text-gray-300">
                                Analyse automatique après transcription
                            </label>
                        </div>
                    )}

<div className={`grid grid-cols-1 ${enableTranslation ? 'md:grid-cols-2' : ''} gap-4 mb-4`}>
                        {/* Source Text Pane */}
                        <div
                            ref={transcriptContainerRef}
                            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 h-64 overflow-y-auto border border-gray-100 dark:border-gray-700 relative transition-all duration-300 ${isListening ? 'ring-2 ring-purple-100 dark:ring-purple-900' : ''}`}
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
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Original (Éditable)</h3>
                                {!isListening && transcript && (
                                    <button
                                        onClick={processWithAI}
                                        disabled={isProcessingAI}
                                        className="text-xs bg-purple-100 dark:bg-purple-500 text-purple-700 dark:text-white px-2 py-1 rounded hover:bg-purple-200 dark:hover:bg-purple-600 font-medium transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                                        {isProcessingAI ? 'Analyse...' : 'Analyser avec IA'}
                                    </button>
                                )}
                            </div>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1 z-10 flex justify-between items-center">
                                <span>Transcription</span>
                                {isListening && <span className="text-red-500 animate-pulse text-[10px]">● Enregistrement</span>}
                            </h2>
                            <div className="flex-1 flex flex-col">
                                {isListening ? (
                                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {!transcript && !interimTranscript && <span className="text-gray-400 italic">Le texte apparaîtra ici...</span>}
                                        {transcript}
                                        {interimTranscript && <span className="text-gray-400">{interimTranscript}</span>}
                                    </div>
                                ) : (
                                    <textarea
                                        className="w-full h-full min-h-[180px] bg-gray-50/50 dark:bg-gray-900/30 p-3 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-700 dark:text-gray-300 leading-relaxed font-sans text-base transition-all"
                                        value={transcript}
                                        onChange={(e) => setTranscript(e.target.value)}
                                        placeholder="Le texte apparaîtra ici..."
                                    />
                                )}
                            </div>

                            {/* Scroll Anchor */}
                            <div ref={transcriptEndRef} />
                        </div>

                        {/* Translation Pane (Conditional) */}
                        {enableTranslation && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 h-64 overflow-y-auto border border-gray-100 dark:border-gray-700 relative">
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1 z-10 text-purple-600 dark:text-purple-400">
                                    Traduction instantanée ({targetLanguage})
                                </h2>
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium">
                                    {translatedTranscript || <span className="text-gray-400 italic">La traduction apparaîtra ici...</span>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI Result Pane (Below Translation as requested) */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-purple-100 dark:border-purple-900/30 mb-4 min-h-[150px] shadow-sm">
                        <h3 className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                            Résultat de l'Agent IA
                        </h3>
                        {isProcessingAI ? (
                            <div className="flex items-center gap-2 text-purple-400 italic">
                                <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                                Analyse en cours...
                            </div>
                        ) : (
                            <div
                                ref={aiResultContainerRef}
                                className="max-h-[200px] overflow-y-auto bg-gray-50 dark:bg-gray-900/50 p-4 rounded border border-gray-100 dark:border-gray-700"
                            >
                                {!aiResult ? (
                                    <span className="text-purple-300 dark:text-purple-500/50 italic">Cliquez sur "Analyser avec IA" pour voir le résultat...</span>
                                ) : (
                                    <textarea
                                        value={aiResult}
                                        onChange={(e) => setAiResult(e.target.value)}
                                        className="w-full h-[180px] bg-white/50 dark:bg-gray-800/50 p-3 border border-purple-200/50 dark:border-purple-800/50 rounded-lg resize-none focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-mono text-sm transition-all"
                                        placeholder="Le résultat s'affichera ici..."
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <button
                            onClick={copyToClipboard}
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
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

            {/* AI Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-lg w-full transform transition-all border border-gray-100 dark:border-gray-700">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings text-gray-600 dark:text-gray-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                            Configuration de l'Agent IA
                        </h2>

                        {/* Model Configuration */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Modèle Gemini (ex: gemini-2.0-flash, gemini-2.5-flash, gemini-3-flash)
                            </label>
                            <input
                                type="text"
                                value={aiModel}
                                onChange={(e) => setAiModel(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="gemini-2.0-flash"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Modèles conseillés : gemini-2.0-flash (rapide), gemini-2.5-pro (puissant), gemini-3-flash (nouveau).
                            </p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Instructions pour l'analyse
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Décrivez ce que l'IA doit faire avec le texte (ex: résumer, extraire des tâches, corriger...)
                            </p>
                            <textarea
                                value={aiInstructions}
                                onChange={(e) => setAiInstructions(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent h-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="Entrez vos instructions ici..."
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border border-green-100 dark:border-green-900 transform scale-100 transition-all">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Sauvegarde réussie !</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Tous les fichiers ont été générés et téléchargés avec succès.
                        </p>
                        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-left">
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5"/></svg>
                                Transcription (PDF)
                            </div>
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5"/></svg>
                                Texte brut (.txt)
                            </div>
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5"/></svg>
                                Audio (.webm)
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}

            {/* Email Transfer Modal - Assistant Workflow */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full border border-purple-100 dark:border-purple-900/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                                <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Assistant de Transfert Email</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Step 1: Download */}
                            <div className={`p-4 rounded-xl border-2 transition-all ${hasDownloadedPDF ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800/50' : 'bg-purple-50/50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800/50'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${hasDownloadedPDF ? 'bg-green-500 text-white' : 'bg-purple-600 text-white'}`}>1</span>
                                        Télécharger le PDF
                                    </h3>
                                    {hasDownloadedPDF && (
                                        <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                            Prêt !
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Le fichier doit être sur votre appareil pour l'attacher à votre e-mail.
                                </p>
                                <button
                                    onClick={() => { downloadPDF(); setHasDownloadedPDF(true); }}
                                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${hasDownloadedPDF ? 'bg-white dark:bg-gray-800 text-green-600 border border-green-200 dark:border-green-800' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md'}`}
                                >
                                    <FileText className="w-5 h-5" />
                                    {hasDownloadedPDF ? 'Télécharger à nouveau' : 'Télécharger le PDF maintenant'}
                                </button>
                            </div>

                            {/* Step 2: Prepare Email */}
                            <div className={`p-4 rounded-xl border-2 transition-all ${hasDownloadedPDF ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/50 opacity-100' : 'bg-gray-50 border-gray-100 dark:bg-gray-900/10 dark:border-gray-800/50 opacity-60'}`}>
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${hasDownloadedPDF ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'}`}>2</span>
                                    Ouvrir votre Messagerie
                                </h3>

                                <div className="space-y-3">
                                    <input
                                        type="email"
                                        value={emailRecipient}
                                        onChange={(e) => setEmailRecipient(e.target.value)}
                                        placeholder="Destinataire (optionnel)"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={emailSubject}
                                        onChange={(e) => setEmailSubject(e.target.value)}
                                        placeholder="Objet de l'e-mail"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    />
                                </div>

                                <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <p className="text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2 leading-tight">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                        Une fois la messagerie ouverte, cliquez sur l'icône trombone (pièce jointe) et sélectionnez le PDF qui vient d'être téléchargé.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-8">
                            <button
                                onClick={() => setShowEmailModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
                            >
                                Fermer
                            </button>
                            <button
                                onClick={sendEmail}
                                disabled={!hasDownloadedPDF}
                                className={`px-6 py-2 rounded-lg transition-all font-bold flex items-center gap-2 ${hasDownloadedPDF ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg scale-105' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                            >
                                <Mail className="w-5 h-5" />
                                {hasDownloadedPDF ? 'Ouvrir Messagerie' : 'Télécharger PDF d\'abord'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className="fixed bottom-6 right-6 z-50 animate-bounce">
                    <div className="bg-gray-800 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">{notification}</span>
                    </div>
                </div>
            )}

            {/* Copyright Footer */}
            <div className="text-center mt-8 pb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Copyright Michel ESPARSA - {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Version Inconnue'}
                </p>
            </div>
        </div>
    );
}
