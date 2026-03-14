import { GoogleGenAI } from "@google/genai";

const delay = (ms) => new Promise(res => setTimeout(res, ms));

let lastCallTime = 0;
const MIN_CALL_INTERVAL = 1000;

const rateLimiter = async () => {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    await delay(MIN_CALL_INTERVAL - timeSinceLastCall);
  }
  lastCallTime = Date.now();
};

export const callGemini = async (modelName, contents, maxRetries = 3) => {
    // 1. Payload Size Check (Gemini inlineData limit is 20MB)
    let totalBinarySize = 0;
    contents.forEach(c => {
        if (c.parts) {
            c.parts.forEach(p => {
                if (p.inlineData && p.inlineData.data) {
                    // Base64 is ~33% larger than binary
                    totalBinarySize += (p.inlineData.data.length * 0.75);
                }
            });
        }
    });

    const sizeMo = (totalBinarySize / 1024 / 1024).toFixed(1);
    console.log(`[Gemini] Taille de la charge utile : ${sizeMo} Mo`);

    await rateLimiter();

    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
                throw new Error("Clé API Gemini manquante. Veuillez configurer VITE_GEMINI_API_KEY.");
            }

            console.log(`[Gemini] Appui sur le bouton, envoi de ${sizeMo} Mo au modèle ${modelName}`);

            // 3. Robust Call Pattern with Timeout (30 seconds)
            const apiCall = (async () => {
                let genAI;
                try {
                    genAI = new GoogleGenAI(apiKey);
                } catch (e) {
                    genAI = new GoogleGenAI({ apiKey });
                }

                const safetySettings = [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ];

                if (typeof genAI.getGenerativeModel === 'function') {
                    const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
                    const res = await model.generateContent({ contents });
                    return await res.response;
                } else if (genAI.models && typeof genAI.models.generateContent === 'function') {
                    return await genAI.models.generateContent({
                        model: modelName,
                        contents: contents,
                        safetySettings
                    });
                } else {
                    throw new Error("Impossible de trouver une méthode d'appel valide dans le SDK Google GenAI.");
                }
            })();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout : L'IA n'a pas répondu après 2 minutes.")), 120000)
            );

            const result = await Promise.race([apiCall, timeoutPromise]);
            console.log("[Gemini] Réponse reçue avec succès.");
            return result;
        } catch (err) {
            console.error(`[Gemini] Erreur tentative ${attempt + 1}:`, err.message);
            const isRateLimitError = err.status === 429 ||
                                   (err.message && err.message.includes("429")) ||
                                   (err.message && err.message.includes("RESOURCE_EXHAUSTED"));

            if (isRateLimitError && attempt < maxRetries) {
                attempt++;
                const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                await delay(waitTime);
                continue;
            }
            throw err;
        }
    }
};

export const extractTextFromResponse = (response) => {
    if (!response) return "";
    try {
        // Universal extraction logic
        if (typeof response.text === 'function') {
            const text = response.text();
            if (typeof text === 'string') return text;
        }
        if (typeof response.text === 'string') return response.text;

        if (response.candidates && response.candidates[0]) {
            const cand = response.candidates[0];
            if (cand.finishReason && cand.finishReason !== "STOP") {
                console.warn(`[Gemini] Finish Reason: ${cand.finishReason}`);
                if (cand.finishReason === "SAFETY") {
                    throw new Error("Contenu bloqué par les filtres de sécurité de l'IA (SAFETY).");
                }
            }
            if (cand.content?.parts) {
                return cand.content.parts.map(p => p.text || "").join('').trim();
            }
        }
        if (response.choices && response.choices[0]?.message?.content) {
            return response.choices[0].message.content;
        }
    } catch (e) {
        console.error("Extraction error:", e);
    }
    return "";
};

export const transcribeWithWhisper = async (blob, url = 'http://localhost:5000/transcribe') => {
    const formData = new FormData();
    formData.append('audio_file', blob, 'recording.wav');

    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la transcription Whisper");
    }

    const data = await response.json();
    return data.text;
};

export const fileToGenerativePart = async (blob) => {
    if (!(blob instanceof Blob)) {
        throw new Error("L'entrée n'est pas un Blob audio valide.");
    }
    if (blob.size === 0) {
        throw new Error("Le fichier audio est vide (0 octets).");
    }

    // Diagnostics in console
    const sizeMo = (blob.size / 1024 / 1024).toFixed(2);
    console.log(`[Base64] Démarrage conversion: type=${blob.type}, taille=${sizeMo} Mo`);

    if (blob.size > 20 * 1024 * 1024) {
        console.warn(`[Base64] Attention: Fichier volumineux (${sizeMo} Mo). Limite Gemini inlineData ~20MB.`);
    }

    try {
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                if (base64String) resolve(base64String);
                else reject(new Error("Échec de l'extraction de la chaîne base64."));
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        let finalMime = (blob.type || "audio/wav").split(';')[0];
        // Normalize video/webm to audio/webm if it's just an audio stream
        if (finalMime === 'video/webm' || finalMime === 'video/x-matroska') {
            finalMime = 'audio/webm';
        }

        console.log(`[Base64] Succès: ${base64Data.length} caractères, MIME=${finalMime}`);

        return {
            inlineData: {
                data: base64Data,
                mimeType: finalMime
            }
        };
    } catch (e) {
        console.error("Conversion Error:", e);
        throw new Error(`Échec conversion base64 (${sizeMo} Mo) : ${e.message}`);
    }
};

export const translateWithGemini = async (text, sourceLang, targetLang, modelName) => {
    if (!modelName) {
        throw new Error("Model name is required for translation");
    }
    if (!text.trim()) return "";
    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Preserve formatting and paragraphs. Output ONLY the translation.

TEXT:
${text}`;

    const response = await callGemini(modelName, [{ role: 'user', parts: [{ text: prompt }] }]);
    return extractTextFromResponse(response);
};
