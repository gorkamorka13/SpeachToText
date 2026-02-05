import { GoogleGenAI } from "@google/genai";

const delay = (ms) => new Promise(res => setTimeout(res, ms));

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

    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
                throw new Error("Clé API Gemini manquante. Veuillez configurer VITE_GEMINI_API_KEY.");
            }

            console.log(`[Gemini] Envoi de ${sizeMo} Mo au modèle ${modelName}`);

            // 2. Robust Initialization (Handle both string and object formats)
            let genAI;
            try {
                genAI = new GoogleGenAI(apiKey);
            } catch (e) {
                genAI = new GoogleGenAI({ apiKey });
            }

            // 3. Robust Call Pattern (Handle different SDK versions/flavors)
            let result;
            if (typeof genAI.getGenerativeModel === 'function') {
                const model = genAI.getGenerativeModel({ model: modelName });
                const res = await model.generateContent({ contents });
                // @google/generative-ai style
                result = await res.response;
            } else if (genAI.models && typeof genAI.models.generateContent === 'function') {
                // @google/genai (Vertex AI style)
                result = await genAI.models.generateContent({
                    model: modelName,
                    contents: contents
                });
            } else {
                throw new Error("Impossible de trouver une méthode d'appel valide dans le SDK Google GenAI.");
            }

            return result;
        } catch (err) {
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

        if (response.candidates && response.candidates[0]?.content?.parts) {
            return response.candidates[0].content.parts.map(p => p.text || "").join('').trim();
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
    console.log(`[Base64] Démarrage conversion: type=${blob.type}, taille=${(blob.size / 1024 / 1024).toFixed(2)} Mo`);

    try {
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        let binary = '';
        const chunk = 8192; // Chunk size to avoid stack overflow with apply
        for (let i = 0; i < bytes.length; i += chunk) {
            const part = bytes.subarray(i, i + chunk);
            binary += String.fromCharCode.apply(null, part);
        }

        const base64Data = btoa(binary);

        if (!base64Data || base64Data.length === 0) {
            throw new Error("Résultat btoa vide.");
        }

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
        throw new Error(`Échec conversion base64 (${(blob.size / 1024 / 1024).toFixed(1)} Mo) : ${e.message}`);
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
