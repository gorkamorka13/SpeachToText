import { GoogleGenAI } from "@google/genai";

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const callGemini = async (model, contents, maxRetries = 3) => {
    let attempt = 0;

    while (attempt <= maxRetries) {
        try {
            // Direct API Call (Client-side)
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
                throw new Error("Clé API Gemini manquante. Veuillez configurer VITE_GEMINI_API_KEY.");
            }

            const genAI = new GoogleGenAI({ apiKey });
            const result = await genAI.models.generateContent({
                model,
                contents
            });
            return result;
        } catch (err) {
            const isRateLimitError = err.status === 429 || (err.message && err.message.includes("429")) || (err.message && err.message.includes("RESOURCE_EXHAUSTED"));

            if (isRateLimitError && attempt < maxRetries) {
                attempt++;
                const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                await delay(waitTime);
                continue;
            }
            throw err;
        }
        attempt++;
    }
};

export const extractTextFromResponse = (response) => {
    if (!response) return "";
    try {
        if (typeof response.text === 'string') return response.text;
        if (typeof response.text === 'function') {
            const text = response.text();
            if (typeof text === 'string') return text;
        }
        if (response.candidates && response.candidates[0]?.content?.parts) {
            const parts = response.candidates[0].content.parts;
            return parts.map(p => {
                if (typeof p.text === 'string') return p.text;
                if (typeof p.text === 'object' && p.text?.text) return p.text.text;
                if (typeof p === 'string') return p;
                return '';
            }).join('').trim();
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
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: (blob.type || "audio/wav").split(';')[0]
                }
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const translateWithGemini = async (text, sourceLang, targetLang, model = 'gemini-2.0-flash') => {
    if (!text.trim()) return "";
    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Preserve formatting and paragraphs. Output ONLY the translation.

TEXT:
${text}`;

    const response = await callGemini(model, [{ role: 'user', parts: [{ text: prompt }] }]);
    return extractTextFromResponse(response);
};
