import React, { useState, useEffect, useRef } from 'react';

import { Mic, MicOff, Copy, Download, Trash2, Clock, Save, Languages, Speaker, FileAudio, FileText, Moon, Sun } from 'lucide-react';
import { jsPDF } from "jspdf";

import { GoogleGenAI } from "@google/genai";

export default function SpeechToTextApp() {
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
    const [aiInstructions, setAiInstructions] = useState(() => {
        return localStorage.getItem('aiInstructions') || 'Tu es un assistant intelligent. Analyse ce texte et fournis un résumé concis.';
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

    // Save AI settings to localStorage

    // Audio Recording States
    const [enableSystemAudio, setEnableSystemAudio] = useState(() => {
        return localStorage.getItem('enableSystemAudio') === 'true'; // Default false
    });

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

    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamsRef = useRef([]); // Keep track to stop tracks later

    const recognitionRef = useRef(null);
    const isListeningRef = useRef(false);

    // Auto-scroll refs
    const transcriptContainerRef = useRef(null);
    const aiResultContainerRef = useRef(null);



    // Simulated Translation Map (Basic demonstration)
    const simulateTranslation = (text, targetLang) => {
        // In a real app, this would call Google Translate / DeepL API
        // For now, we simulate by appending a tag or simple reversal for demo
        if (!text) return '';
        return `[Traduction en ${targetLang}]: ${text}`;
    };

    // Real Google Gemini AI Processing (using new @google/genai SDK)
    const processWithAI = async () => {
        if (!transcript) return;
        setIsProcessingAI(true);
        setAiResult(''); // Clear previous result

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

Texte à analyser :
"${transcript}"
            `;

            const response = await client.models.generateContent({
                model: aiModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });

            const text = response.text;

            if (!text) {
                console.log("Full response object:", response);
                throw new Error("Réponse vide de l'IA ou bloquée par les filtres de sécurité.");
            }

            setAiResult(text);
        } catch (error) {
            console.error("Erreur AI:", error);
            setAiResult(`Erreur lors de l'analyse IA : ${error.message || "Erreur inconnue"}`);
        } finally {
            setIsProcessingAI(false);
        }
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

            if (finalTranscript || currentInterimTranscript) {
                setTranscript(prev => prev + finalTranscript);
                setInterimTranscript(currentInterimTranscript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Erreur de reconnaissance:', event.error);
            if (event.error === 'no-speech') {
                return;
            }
            if (isListeningRef.current) stopRecording();
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

    // Real-time translation effect
    useEffect(() => {
        if (!enableTranslation) {
            setTranslatedTranscript('');
            return;
        }
        const fullText = transcript + interimTranscript;
        if (fullText) {
            setTranslatedTranscript(simulateTranslation(fullText, targetLanguage));
        }
    }, [transcript, interimTranscript, targetLanguage, enableTranslation]);



    const stopMediaTracks = () => {
        streamsRef.current.forEach(stream => {
            stream.getTracks().forEach(track => track.stop());
        });
        streamsRef.current = [];
    };

    const startRecording = async () => {
        try {
            // 1. Start Speech Recognition
            recognitionRef.current.start();
            setIsListening(true);
            isListeningRef.current = true; // Sync Ref
            setAudioBlob(null);
            audioChunksRef.current = [];

            // 2. Setup Audio Recording (Mic + System)
            const streams = [];
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
                    alert("Capture audio système annulée. Seul le microphone sera enregistré.");
                }
            }

            streamsRef.current = streams;

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
                audioContext.close(); // Clean up context
            };

            recorder.start();
            mediaRecorderRef.current = recorder;

        } catch (err) {
            console.error("Error starting recording:", err);
            setIsListening(false);
            isListeningRef.current = false;
            alert("Erreur microphone/audio : " + (err.message || err));
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current) recognitionRef.current.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
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
        const element = document.createElement('a');
        const file = new Blob([transcript], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `transcription-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const downloadAudio = () => {
        if (!audioBlob) return;
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `recording-${new Date().toISOString().slice(0, 10)}.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showNotification("Fichier Audio téléchargé !");
    };

    const downloadPDF = () => {
        if (!aiResult) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 10;
        const maxLineWidth = pageWidth - margin * 2;

        let yPosition = 20;

        // AI Analysis ONLY
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0); // Black
        doc.setFont("helvetica", "normal");

        const splitAI = doc.splitTextToSize(aiResult, maxLineWidth);
        doc.text(splitAI, margin, yPosition);

        doc.save(`analyse-ia-${new Date().toISOString().slice(0, 10)}.pdf`);
        showNotification("Fichier PDF enregistré !");
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

                            <div className="hidden sm:flex items-center justify-center text-gray-400">
                                <Languages className="w-5 h-5" />
                            </div>

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
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
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
                                        Arrêter
                                    </>
                                ) : (
                                    <>
                                        <Mic className="w-5 h-5" />
                                        Commencer
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* Source Text Pane */}
                        <div
                            ref={transcriptContainerRef}
                            className="bg-gray-50 rounded-lg p-6 overflow-y-auto relative border border-gray-200 h-[300px]"
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
                            {isListening ? (
                                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-lg">
                                    {transcript}
                                    <span className="text-gray-400 italic">{interimTranscript}</span>
                                    {!transcript && !interimTranscript && 'Cliquez sur "Commencer" et parlez...'}
                                </p>
                            ) : (
                                <textarea
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    className="w-full h-[220px] p-2 bg-transparent border-0 focus:ring-0 text-gray-800 leading-relaxed text-lg resize-none placeholder-gray-400"
                                    placeholder="Cliquez sur 'Commencer' et parlez, ou tapez votre texte ici..."
                                />
                            )}
                            {interimTranscript && !isListening && (
                                <p className="text-gray-400 italic mt-2 px-2 animate-pulse">
                                    {interimTranscript}
                                </p>
                            )}
                        </div>

                        {/* Translated Text Pane */}
                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-6 overflow-y-auto border border-blue-100 dark:border-blue-900/30 h-[300px]">
                            <h3 className="text-xs font-semibold text-blue-400 dark:text-blue-300 uppercase tracking-wider mb-2">Traduction Instantanée</h3>
                            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed text-lg font-medium">
                                {translatedTranscript || <span className="text-blue-300 dark:text-blue-500/50 italic">La traduction apparaîtra ici...</span>}
                            </p>
                        </div>
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
                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-mono text-sm">
                                    {aiResult || <span className="text-purple-300 dark:text-purple-500/50 italic">Cliquez sur "Analyser avec IA" pour voir le résultat...</span>}
                                </p>
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
                            Sauvegarde Texte
                        </button>
                        <button
                            onClick={downloadPDF}
                            disabled={!aiResult}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                        >
                            <FileText className="w-4 h-4" />
                            Sauvegarde PDF
                        </button>
                        <button
                            onClick={downloadAudio}
                            disabled={!audioBlob}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                        >
                            <FileAudio className="w-4 h-4" />
                            Sauvegarde Audio
                        </button>
                        <button
                            onClick={saveTranscript}
                            disabled={!transcript}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            Sauvegarde historique
                        </button>
                        <button
                            onClick={clearTranscript}
                            disabled={!transcript && !audioBlob}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                        >
                            <Trash2 className="w-4 h-4" />
                            Effacer
                        </button>
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
                    Copyright Michel ESPARSA - 15/01/2025
                </p>
            </div>
        </div>
    );
}
