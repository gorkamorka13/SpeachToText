import React, { useState, useEffect, useRef } from 'react';
import { Copy, Download, Save, Trash2, Mic, StopCircle, RefreshCw, FileAudio, Settings, HelpCircle, Mail, Speaker, Clock, FileText, FileBadge, Volume2, Square, MicOff, Languages, Moon, Sun } from 'lucide-react';
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { GoogleGenAI } from "@google/genai";
import ArabicReshaper from 'arabic-reshaper';
import { amiriFont } from './AmiriFont';

const LanguageSelector = ({ label, value, onChange, languages, disabled, className, isDark }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLang = languages.find(l => l.code === value) || languages[0];

    return (
        <div ref={containerRef} className={`relative flex-1 ${className}`}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-sm sm:text-base h-[46px] sm:h-[50px] transition-all shadow-sm ${isOpen ? 'ring-2 ring-purple-500 border-transparent' : ''}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <img
                        src={`https://flagcdn.com/w40/${selectedLang.countryCode}.png`}
                        alt={selectedLang.name}
                        className="w-5 h-auto rounded-sm flex-shrink-0 shadow-sm"
                    />
                    <span className="truncate">{selectedLang.name.split(' ').slice(1).join(' ') || selectedLang.name}</span>
                </div>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => {
                                    onChange(lang.code);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors ${value === lang.code
                                    ? 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                    }`}
                            >
                                <img
                                    src={`https://flagcdn.com/w40/${lang.countryCode}.png`}
                                    alt={lang.name}
                                    className="w-5 h-auto rounded-sm flex-shrink-0 shadow-sm"
                                />
                                <span className="flex-1 text-left">{lang.name.split(' ').slice(1).join(' ') || lang.name}</span>
                                {value === lang.code && (
                                    <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

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
1) vérifiant l'orthographe,
2) supprimant les espaces manquants entre les mots,
3) supprimant les sauts de lignes inutiles,
4) supprimant les retours à la ligne inutiles,
5) supprimant les Carriage Return Line Feed et vérifie le texte
6) identifiant des paragraphes dans ce texte.
7) met le en forme et produit le fichier texte brut`;
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
    const [tokenUsage, setTokenUsage] = useState({
        lastPrompt: 0,
        lastResponse: 0,
        totalSession: 0
    });
    const [speakingSection, setSpeakingSection] = useState(null); // 'transcript', 'translation', 'ai'
    const [errorLogs, setErrorLogs] = useState([]);

    // Audio Settings
    const [enableSystemAudio, setEnableSystemAudio] = useState(() => {
        return localStorage.getItem('enableSystemAudio') === 'true'; // Default false
    });

    const [pdfJustify, setPdfJustify] = useState(() => {
        const saved = localStorage.getItem('pdfJustify');
        return saved !== null ? saved === 'true' : true; // Default true
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

    const callGemini = async (model, contents) => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // Check if we should use the Netlify function (Production or explicit testing)
        // We try the function first if not local, or if we want to force server-side
        if (!isLocal) {
            try {
                const resp = await fetch('/.netlify/functions/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, contents })
                });

                if (resp.ok) {
                    return await resp.json();
                } else {
                    const errData = await resp.json();
                    console.error("Netlify Function Error:", errData);
                    // If the function exists but failed (e.g. key missing on Netlify),
                    // we might want to throw or fallback.
                    // Fallback to client-side if a key is bundled.
                }
            } catch (err) {
                console.warn("Netlify function not reachable, trying client-side SDK:", err);
            }
        }

        // Client-side fallback / Local Dev
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            throw new Error("Clé API Gemini manquante. Veuillez configurer VITE_GEMINI_API_KEY.");
        }
        const client = new GoogleGenAI({ apiKey });
        return await client.models.generateContent({ model, contents });
    };

    const handleSpeak = (text, section, langCode) => {
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
    };

    const copyToClipboard = async (text) => {
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
    };

    const translateWithGemini = async (text, sourceLang, targetLang) => {
        if (!text) return '';
        try {
            const prompt = `Traduire le texte suivant de la langue "${sourceLang}" vers la langue "${targetLang}". Ne renvoie QUE la traduction, sans aucun commentaire : "${text}"`;

            const response = await callGemini('gemini-2.0-flash', [
                { role: 'user', parts: [{ text: prompt }] }
            ]);

            // Track tokens
            if (response.usageMetadata) {
                const { promptTokenCount, candidatesTokenCount, totalTokenCount } = response.usageMetadata;
                setTokenUsage(prev => ({
                    lastPrompt: promptTokenCount,
                    lastResponse: candidatesTokenCount,
                    totalSession: prev.totalSession + totalTokenCount
                }));
            }

            const translated = extractTextFromResponse(response);
            return translated || `[Erreur de traduction]`;
        } catch (error) {
            console.error("Translation Error:", error);
            return `[Erreur: ${error.message}]`;
        }
    };

    const reshapeArabic = (text) => {
        if (!text) return "";
        const hasArabic = /[\u0600-\u06FF]/.test(text);
        if (!hasArabic) return text;

        try {
            // Step 1: Reshape characters (handle connections/ligatures)
            // Note: We don't reverse here anymore, we'll do it line-by-line in PDF export
            // to ensure correct word order when wrapping and handles BiDi.
            return ArabicReshaper.convertArabic(text);
        } catch (e) {
            console.error("Arabic Reshaping Error:", e);
            return text;
        }
    };

    /**
     * Helper to prepare text for RTL rendering.
     * UPDATED: We now avoid full character reversal because modern PDF readers
     * (Chrome, Acrobat) often handle RTL automatically if they see Arabic glyphs.
     * Manual reversal can cause "double-reversal" (looking backwards in the viewer).
     * We still keep reshaping to ensure characters connect correctly.
     */
    const prepareRTLText = (text) => {
        if (!text) return "";
        // Step 1: Reshape (handle connections/ligatures)
        const reshaped = ArabicReshaper.convertArabic(text);

        // Step 2: Return as is (logical order).
        // Modern PDF readers (Chrome/Acrobat) handle RTL automatically for Arabic glyphs.
        // Copy-paste will also preserve the correct logical order.
        return reshaped;
    };
    const trimSilence = async (audioBlob) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const channelData = audioBuffer.getChannelData(0);
            const sampleRate = audioBuffer.sampleRate;
            const threshold = 0.01;

            let start = 0;
            while (start < channelData.length && Math.abs(channelData[start]) < threshold) {
                start++;
            }

            let end = channelData.length - 1;
            while (end > start && Math.abs(channelData[end]) < threshold) {
                end--;
            }

            if (start >= end) return audioBlob; // No sound found or very short, return original

            const duration = (end - start) / sampleRate;
            const newBuffer = audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                end - start,
                sampleRate
            );

            for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
                newBuffer.copyToChannel(audioBuffer.getChannelData(i).subarray(start, end), i);
            }

            // Convert AudioBuffer to WAV Blob
            return bufferToWav(newBuffer);
        } catch (e) {
            console.error("Trim Silence error:", e);
            return audioBlob; // Fallback to original
        }
    };

    // Helper to convert AudioBuffer to WAV
    function bufferToWav(abuffer) {
        let numOfChan = abuffer.numberOfChannels,
            length = abuffer.length * numOfChan * 2 + 44,
            buffer = new ArrayBuffer(length),
            view = new DataView(buffer),
            channels = [], i, sample,
            offset = 0,
            pos = 0;

        // write WAVE header
        setUint32(0x46464952);                         // "RIFF"
        setUint32(length - 8);                         // file length - 8
        setUint32(0x45564157);                         // "WAVE"
        setUint32(0x20746d66);                         // "fmt " chunk
        setUint32(16);                                  // length = 16
        setUint16(1);                                   // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2);                      // block-align
        setUint16(16);                                  // 16-bit (hardcoded)
        setUint32(0x61746164);                         // "data" - chunk
        setUint32(length - pos - 4);                   // chunk length

        // write interleaved data
        for (i = 0; i < abuffer.numberOfChannels; i++)
            channels.push(abuffer.getChannelData(i));

        while (pos < length) {
            for (i = 0; i < numOfChan; i++) {             // interleave channels
                sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
                sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0; // scale to 16-bit signed int
                view.setInt16(pos, sample, true);          // write 16-bit sample
                pos += 2;
            }
            offset++
        }

        return new Blob([buffer], { type: "audio/wav" });

        function setUint16(data) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data) {
            view.setUint32(pos, data, true);
            pos += 4;
        }
    }

    const fileToGenerativePart = async (file) => {
        const base64EncodedDataPromise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(file);
        });

        // Gemini is VERY strict about mimeType.
        // 1. Strip codec parameters (e.g., "audio/webm;codecs=opus" -> "audio/webm")
        let mimeType = file.type.split(';')[0].trim();

        // 2. Map video/webm (common audio-only container) to audio/webm
        if (mimeType === 'video/webm') mimeType = 'audio/webm';

        // 3. Fallback for empty mimeType based on extension
        if (!mimeType && file.name) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext === 'mp3') mimeType = 'audio/mpeg';
            else if (ext === 'wav') mimeType = 'audio/wav';
            else if (ext === 'webm') mimeType = 'audio/webm';
        }

        return {
            inlineData: { data: await base64EncodedDataPromise, mimeType: mimeType || 'audio/mpeg' },
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
        if (!isAutoSavingRef.current) setAiResult('');

        try {
            const audioPart = await fileToGenerativePart(blobToUse);
            const prompt = "Transcribe the following audio exactly as spoken. Output only the transcription, no introductory text.";

            const response = await callGemini('gemini-2.0-flash', [
                { role: 'user', parts: [{ text: prompt }, audioPart] }
            ]);

            // Track tokens
            if (response.usageMetadata) {
                const { promptTokenCount, candidatesTokenCount, totalTokenCount } = response.usageMetadata;
                setTokenUsage(prev => ({
                    lastPrompt: promptTokenCount,
                    lastResponse: candidatesTokenCount,
                    totalSession: prev.totalSession + totalTokenCount
                }));
            }

            const text = extractTextFromResponse(response);

            if (text) {
                if (isAutoSavingRef.current) {
                    setTranscript(text);
                } else {
                    setTranscript(prev => prev + (prev ? ' ' : '') + text);
                }

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
            const prompt = `
Instructions de l'utilisateur : ${aiInstructions}

IMPORTANT : Ne jamais ajouter de texte introductif comme "Voici le texte corrigé" ou "Résultat :". Renvoie UNIQUEMENT le contenu demandé.

Texte à analyser :
"${textToAnalyze}"
            `;

            const response = await callGemini(aiModel, [
                { role: 'user', parts: [{ text: prompt }] }
            ]);

            // Track tokens
            if (response.usageMetadata) {
                const { promptTokenCount, candidatesTokenCount, totalTokenCount } = response.usageMetadata;
                setTokenUsage(prev => ({
                    lastPrompt: promptTokenCount,
                    lastResponse: candidatesTokenCount,
                    totalSession: prev.totalSession + totalTokenCount
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
        const fullText = (debouncedTranscript + debouncedInterimTranscript).trim();
        if (fullText) {
            const runTranslation = async () => {
                const result = await translateWithGemini(fullText, language, targetLanguage);
                setTranslatedTranscript(result);
            };
            runTranslation();
        } else {
            setTranslatedTranscript('');
        }
    }, [debouncedTranscript, debouncedInterimTranscript, targetLanguage, language, enableTranslation]);



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
                    transcribeAudioWithGemini(blob);
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

        const isAudio = file.type.startsWith('audio/') ||
            file.type === 'video/webm' ||
            file.name.toLowerCase().endsWith('.webm') ||
            file.name.toLowerCase().endsWith('.mp3') ||
            file.name.toLowerCase().endsWith('.wav');

        if (isAudio) {
            clearTranscript();
            setUploadedFile(file);
            setAudioBlob(file); // Set audioBlob so the player and Gemini can use it
            showNotification(`Fichier "${file.name}" chargé`);
        } else {
            logError(`Fichier non reconnu (${file.type}). Veuillez sélectionner un fichier audio valide.`);
        }
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

        const isAudio = file.type.startsWith('audio/') ||
            file.type === 'video/webm' ||
            file.name.toLowerCase().endsWith('.webm') ||
            file.name.toLowerCase().endsWith('.mp3') ||
            file.name.toLowerCase().endsWith('.wav');

        if (isAudio) {
            clearTranscript();
            setUploadedFile(file);
            setAudioBlob(file); // Set audioBlob so the player and Gemini can use it
            showNotification(`Fichier "${file.name}" déposé`);
        } else {
            logError(`Fichier non reconnu (${file.type}). Veuillez déposez un fichier audio valide.`);
        }
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

        doc.addFileToVFS('Amiri-Regular.ttf', amiriFont);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");

        // Helper for consistent text rendering with Arabic support
        const writeParagraphs = (text, x, y, width, align = 'left') => {
            const paragraphs = text.split('\n');
            const innerLineHeight = 6;
            let currentY = y;

            for (let p = 0; p < paragraphs.length; p++) {
                const paragraph = paragraphs[p];
                if (!paragraph.trim()) {
                    if (p < paragraphs.length - 1) currentY += innerLineHeight;
                    continue;
                }

                const isArabic = /[\u0600-\u06FF]/.test(paragraph);
                doc.setFont(isArabic ? "Amiri" : "helvetica", "normal");

                // Reshape but don't reverse paragraph level (avoid wrapping issues)
                const reshapedPara = isArabic ? ArabicReshaper.convertArabic(paragraph) : paragraph;
                const lines = doc.splitTextToSize(reshapedPara, width);

                for (let i = 0; i < lines.length; i++) {
                    if (currentY > pageHeight - 20) {
                        doc.addPage();
                        currentY = 20;
                        // On new page, we should stick to the current font
                        doc.setFont(isArabic ? "Amiri" : "helvetica", "normal");
                    }

                    let line = lines[i];
                    let currentAlign = align;
                    let currentX = x;

                    if (isArabic) {
                        // Prepare lines for RTL while preserving logical order
                        line = prepareRTLText(line);
                        currentAlign = 'right';
                        currentX = x + width;
                    }

                    const isLastLine = i === lines.length - 1;
                    const options = (pdfJustify && !isLastLine && !isArabic)
                        ? { align: 'justify', maxWidth: width }
                        : { align: currentAlign };

                    doc.text(line, currentX, currentY, options);
                    currentY += innerLineHeight;
                }
                currentY += 2; // Extra spacer between paragraphs
            }
            return currentY;
        };

        if (currentAIResult) {
            // ONLY AI Result Mode
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Encounter", margin, yPosition);
            yPosition += 10;

            doc.setFontSize(11);
            yPosition = writeParagraphs(currentAIResult, margin, yPosition, availableWidth, 'left');
        } else {
            // Transcript Mode (Original + optional Translation)
            if (enableTranslation) {
                const colGap = 10;
                const colWidth = (availableWidth - colGap) / 2;

                // Column Headers
                doc.setFont("helvetica", "bold");
                doc.text("Original", margin, yPosition);
                doc.text(`Traduction (${targetLanguage})`, margin + colWidth + colGap, yPosition);
                yPosition += 7;
                doc.setFont("helvetica", "normal");

                // Process paragraphs to keep original and translation relatively aligned
                const originalParagraphs = currentTranscript.split('\n');
                const translatedParagraphs = currentTranslation.split('\n');
                const maxPara = Math.max(originalParagraphs.length, translatedParagraphs.length);
                const lineHeight = 5;

                for (let i = 0; i < maxPara; i++) {
                    const origPara = originalParagraphs[i] || "";
                    const transPara = translatedParagraphs[i] || "";

                    const isArabicOrig = /[\u0600-\u06FF]/.test(origPara);
                    const isArabicTrans = /[\u0600-\u06FF]/.test(transPara);

                    const reshapedOrig = isArabicOrig ? ArabicReshaper.convertArabic(origPara) : origPara;
                    const reshapedTrans = isArabicTrans ? ArabicReshaper.convertArabic(transPara) : transPara;

                    // Split each column
                    doc.setFont(isArabicOrig ? "Amiri" : "helvetica", "normal");
                    const splitOrig = doc.splitTextToSize(reshapedOrig, colWidth);

                    doc.setFont(isArabicTrans ? "Amiri" : "helvetica", "normal");
                    const splitTrans = doc.splitTextToSize(reshapedTrans, colWidth);

                    const paraLines = Math.max(splitOrig.length, splitTrans.length);

                    // Check if we need a new page
                    if (yPosition + (paraLines * lineHeight) > pageHeight - 20 && yPosition > 30) {
                        doc.addPage();
                        yPosition = 20;
                        doc.setFont("helvetica", "bold");
                        doc.text("Original", margin, yPosition);
                        doc.text(`Traduction (${targetLanguage})`, margin + colWidth + colGap, yPosition);
                        yPosition += 7;
                    }

                    // Render lines side-by-side
                    for (let j = 0; j < paraLines; j++) {
                        if (yPosition > pageHeight - 20) {
                            doc.addPage();
                            yPosition = 20;
                            doc.setFont("helvetica", "bold");
                            doc.text("Original", margin, yPosition);
                            doc.text(`Traduction (${targetLanguage})`, margin + colWidth + colGap, yPosition);
                            yPosition += 7;
                        }

                        // Original column
                        if (j < splitOrig.length) {
                            doc.setFont(isArabicOrig ? "Amiri" : "helvetica", "normal");
                            let line = splitOrig[j];
                            let xPos = margin;
                            let align = 'left';
                            if (isArabicOrig) {
                                line = prepareRTLText(line);
                                xPos = margin + colWidth;
                                align = 'right';
                            }
                            const isLastLine = j === splitOrig.length - 1;
                            const options = (pdfJustify && !isLastLine && !isArabicOrig) ? { align: 'justify', maxWidth: colWidth } : { align };
                            doc.text(line, xPos, yPosition, options);
                        }

                        // Translation column
                        if (j < splitTrans.length) {
                            doc.setFont(isArabicTrans ? "Amiri" : "helvetica", "normal");
                            let line = splitTrans[j];
                            let xPos = margin + colWidth + colGap;
                            let align = 'left';
                            if (isArabicTrans) {
                                line = prepareRTLText(line);
                                xPos = margin + colWidth + colGap + colWidth;
                                align = 'right';
                            }
                            const isLastLine = j === splitTrans.length - 1;
                            const options = (pdfJustify && !isLastLine && !isArabicTrans) ? { align: 'justify', maxWidth: colWidth } : { align };
                            doc.text(line, xPos, yPosition, options);
                        }

                        yPosition += lineHeight;
                    }
                    yPosition += 2; // Paragraph space
                }
            } else {
                // Single Column
                yPosition = writeParagraphs(currentTranscript, margin, yPosition, availableWidth, 'left');
            }
        }

        // Pagination & Date
        const totalPages = doc.internal.getNumberOfPages();
        const currentDate = new Date().toLocaleDateString('fr-FR');
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150);
            const footerText = `Page ${i} / ${totalPages} - ${currentDate}`;
            doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        return doc;
    };

    const downloadDOCX = async () => {
        const currentTranscript = transcriptRef.current;
        const currentAIResult = aiResultRef.current;
        const currentTranslation = translatedTranscriptRef.current;

        if (!currentTranscript && !currentAIResult) {
            showNotification("Rien à exporter.");
            return;
        }

        const sections = [];
        const children = [];

        // Title
        children.push(new Paragraph({
            text: "Rapport de Transcription Encounter",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }));

        // Date & Info
        children.push(new Paragraph({
            children: [
                new TextRun({ text: `Date : ${new Date().toLocaleDateString('fr-FR')}`, bold: true }),
                new TextRun({ break: 1, text: `Modèle utilisé : ${aiModel}` }),
            ],
            spacing: { after: 400 },
        }));

        if (currentAIResult) {
            children.push(new Paragraph({ text: "Analyse de l'Agent IA", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
            children.push(new Paragraph({
                children: [new TextRun(currentAIResult)],
                alignment: pdfJustify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
                spacing: { after: 400 },
            }));
        }

        if (currentTranscript) {
            children.push(new Paragraph({ text: "Transcription Originale", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
            children.push(new Paragraph({
                children: [new TextRun(currentTranscript)],
                alignment: pdfJustify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
                spacing: { after: 400 },
            }));
        }

        if (enableTranslation && currentTranslation) {
            children.push(new Paragraph({ text: `Traduction (${targetLanguage})`, heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
            children.push(new Paragraph({
                children: [new TextRun(currentTranslation)],
                alignment: pdfJustify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
                spacing: { after: 400 },
            }));
        }

        // Footer-like info
        children.push(new Paragraph({
            children: [new TextRun({ text: "Généré par SpeachToText - Encounter AI", italic: true, size: 18 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 800 },
        }));

        const doc = new Document({
            sections: [{
                properties: {},
                children: children,
            }],
        });

        try {
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `encounter-report-${new Date().toISOString().slice(0, 10)}.docx`);
            showNotification("Fichier Word (.docx) généré !");
        } catch (error) {
            console.error("DOCX generation error:", error);
            showNotification("Erreur lors de la génération Word.");
        }
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
        { code: 'fr-FR', name: '🇫🇷 Français', countryCode: 'fr' },
        { code: 'en-US', name: '🇺🇸 English', countryCode: 'us' },
        { code: 'es-ES', name: '🇪🇸 Español', countryCode: 'es' },
        { code: 'de-DE', name: '🇩🇪 Deutsch', countryCode: 'de' },
        { code: 'it-IT', name: '🇮🇹 Italiano', countryCode: 'it' },
        { code: 'ar-SA', name: '🇸🇦 العربية', countryCode: 'sa' }
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
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div className="flex items-center gap-12 w-full sm:w-auto">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-white flex items-center gap-2 sm:gap-3">
                                <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-500" />
                                <span className="truncate">Speech-to-Text</span>
                            </h1>
                        </div>
                        <img
                            src={darkMode ? "/Encounter_long_light.webp" : "/Encounter_long_dark.webp"}
                            alt="Encounter Logo"
                            className="absolute left-1/2 -translate-x-1/2 top-4 md:top-6 mt-[5px] h-6 sm:h-8 md:h-10 z-20 pointer-events-none"
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
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

                            <LanguageSelector
                                value={language}
                                onChange={setLanguage}
                                languages={languages}
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
                                        languages={languages}
                                        className="flex-1"
                                    />
                                </>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between w-full">
                            {/* Drag & Drop Zone */}
                            <div
                                className={`flex-1 w-full p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${isDragging
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
                                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                                        <FileAudio className="w-5 h-5" />
                                        <span className="text-sm font-medium truncate max-w-[200px]">{uploadedFile.name}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setAudioBlob(null); }}
                                            className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-full"
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
                                            className={`h-full flex-1 rounded-sm transition-all duration-75 ${(volumeLevel / 128) > (i / 20)
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
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
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
                                <div></div>
                                {!isListening && transcript && (
                                    <button
                                        onClick={processWithAI}
                                        disabled={isProcessingAI}
                                        className="text-xs bg-purple-100 dark:bg-purple-500 text-purple-700 dark:text-white px-2 py-1 rounded hover:bg-purple-200 dark:hover:bg-purple-600 font-medium transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                        {isProcessingAI ? 'Analyse...' : 'Analyser avec IA'}
                                    </button>
                                )}
                            </div>
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1 z-10 flex justify-between items-center">
                                <span>Transcription Originale</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => copyToClipboard(transcript)}
                                        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg shadow-sm hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1.5"
                                        title="Copier la transcription"
                                    >
                                        <Copy className="w-5 h-5" />
                                        <span className="text-[10px]">Copier</span>
                                    </button>
                                    <button
                                        onClick={() => handleSpeak(transcript, 'transcript', language)}
                                        className={`p-2 rounded-lg shadow-sm font-semibold transition-all flex items-center gap-1.5 ${speakingSection === 'transcript'
                                            ? 'bg-purple-600 text-white animate-pulse'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-500 hover:text-white'
                                            }`}
                                        title={speakingSection === 'transcript' ? "Arrêter la lecture" : "Lire la transcription"}
                                    >
                                        {speakingSection === 'transcript' ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}
                                        <span className="text-[10px]">Lire</span>
                                    </button>
                                </div>
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
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1 z-10 text-purple-600 dark:text-purple-400 flex items-center justify-between">
                                    <span>Traduction instantanée ({targetLanguage})</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => copyToClipboard(translatedTranscript)}
                                            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg shadow-sm hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1.5"
                                            title="Copier la traduction"
                                        >
                                            <Copy className="w-5 h-5" />
                                            <span className="text-[10px]">Copier</span>
                                        </button>
                                        <button
                                            onClick={() => handleSpeak(translatedTranscript, 'translation', targetLanguage)}
                                            className={`p-2 rounded-lg shadow-sm font-semibold transition-all flex items-center gap-1.5 ${speakingSection === 'translation'
                                                ? 'bg-purple-600 text-white animate-pulse'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-500 hover:text-white'
                                                }`}
                                            title={speakingSection === 'translation' ? "Arrêter la lecture" : "Lire la traduction"}
                                        >
                                            {speakingSection === 'translation' ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}
                                            <span className="text-[10px]">Lire</span>
                                        </button>
                                    </div>
                                </h2>
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium">
                                    {translatedTranscript || <span className="text-gray-400 italic">La traduction apparaîtra ici...</span>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-purple-100 dark:border-purple-900/30 mb-4 min-h-[150px] shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bot"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
                                Résultat de l'Agent IA
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => copyToClipboard(aiResult)}
                                    className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg shadow-sm hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1.5"
                                    title="Copier le résultat"
                                >
                                    <Copy className="w-5 h-5" />
                                    <span className="text-[10px]">Copier</span>
                                </button>
                                <button
                                    onClick={() => handleSpeak(aiResult, 'ai', language)}
                                    className={`p-2 rounded-lg shadow-sm font-semibold transition-all flex items-center gap-1.5 ${speakingSection === 'ai' ? 'bg-purple-600 text-white animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-purple-500 hover:text-white'}`}
                                    title={speakingSection === 'ai' ? "Arrêter la lecture" : "Lire le résultat"}
                                >
                                    {speakingSection === 'ai' ? <Square className="w-5 h-5 fill-current" /> : <Volume2 className="w-5 h-5" />}
                                    <span className="text-[10px]">Lire</span>
                                </button>
                            </div>
                        </div>
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

                        {/* Token Counter UI */}
                        <div className="mt-3 pt-3 border-t border-purple-50 sm:border-purple-100/50 dark:border-purple-900/20 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-4 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                                <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400/50"></span>
                                    Dernier : <span className="text-purple-600 dark:text-purple-400 font-bold">{tokenUsage.lastPrompt + tokenUsage.lastResponse}</span> <span className="opacity-60">(P:{tokenUsage.lastPrompt} R:{tokenUsage.lastResponse})</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50"></span>
                                    Session : <span className="text-blue-600 dark:text-blue-400 font-bold">{tokenUsage.totalSession}</span>
                                </div>
                            </div>
                            <button
                                onClick={resetTokenUsage}
                                className="text-[10px] sm:text-xs text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1"
                                title="Réinitialiser le compteur de session"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                                Réinitialiser
                            </button>
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
                            onClick={downloadDOCX}
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

            {/* AI Settings Modal */}
            {
                showSettings && (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-lg w-full transform transition-all border border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings text-gray-600 dark:text-gray-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
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

                            {/* PDF Configuration */}
                            <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-purple-500" />
                                    Paramètres PDF
                                </h3>
                                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Justifier le texte</span>
                                        <span className="text-[10px] text-gray-500">Aligne le texte uniformément à gauche et à droite</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={pdfJustify}
                                            onChange={(e) => setPdfJustify(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
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
                )
            }

            {/* Success Modal */}
            {
                showSuccessModal && (
                    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border border-green-100 dark:border-green-900 transform scale-100 transition-all">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400"><path d="M20 6 9 17l-5-5" /></svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Sauvegarde réussie !</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Tous les fichiers ont été générés et téléchargés avec succès.
                            </p>
                            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-left">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5" /></svg>
                                    Transcription (PDF)
                                </div>
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5" /></svg>
                                    Texte brut (.txt)
                                </div>
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M20 6 9 17l-5-5" /></svg>
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
                )
            }

            {/* Email Transfer Modal - Assistant Workflow */}
            {
                showEmailModal && (
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
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
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
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
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
                )
            }


            {/* Copyright Footer */}
            <div className="text-center mt-8 pb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Copyright Michel ESPARSA - {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'Version Inconnue'}
                </p>
            </div>
        </div >
    );
}
