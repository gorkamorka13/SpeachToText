import { GoogleGenAI } from "@google/genai";
import { validateApiRequest, sanitizeServerInput } from './utils/validation.js';

export const handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    try {
        // Validate and sanitize request body
        const validation = validateApiRequest(event.body);
        if (!validation.valid) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: validation.error }),
                headers: { 'Content-Type': 'application/json' }
            };
        }
        
        const { model, contents } = validation.data;
        
        // Validate model name (prevent injection)
        const sanitizedModel = sanitizeServerInput(model || 'gemini-2.0-flash');
        if (!sanitizedModel.startsWith('gemini-')) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid model name' }),
                headers: { 'Content-Type': 'application/json' }
            };
        }

        const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
             return {
                statusCode: 500,
                body: JSON.stringify({ error: "Clé API non configurée sur le serveur Netlify (VITE_GEMINI_API_KEY ou GEMINI_API_KEY manquante)." }),
                headers: { 'Content-Type': 'application/json' }
            };
        }

        const client = new GoogleGenAI({ apiKey });

        // Call Gemini directly with the provided structure
        const response = await client.models.generateContent({
            model: sanitizedModel,
            contents,
        });

        return {
            statusCode: 200,
            body: JSON.stringify(response),
            headers: { 'Content-Type': 'application/json' }
        };
    } catch (error) {
        console.error("Netlify Function [gemini] Error:", error);
        const isRateLimit = error.message && (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED"));
        return {
            statusCode: isRateLimit ? 429 : 500,
            body: JSON.stringify({ error: error.message }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};
