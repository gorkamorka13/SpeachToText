import { callGemini, extractTextFromResponse } from '../aiService';
import { callOpenRouter } from './openrouterProvider';

/**
 * Available AI providers (free-friendly, inspired by Screen2LaTeX's factory):
 * - gemini     : Google Gemini cloud (free tier available on Flash models via
 *                a free key from https://aistudio.google.com)
 * - openrouter : OpenRouter REST API (free models tagged ":free", key from
 *                https://openrouter.ai/keys)
 */
export const AI_PROVIDERS = {
    GEMINI: 'gemini',
    OPENROUTER: 'openrouter'
};

/**
 * Sends contents to the configured provider and returns a raw response
 * (Gemini-style) that extractTextFromResponse() can consume.
 */
export const callModel = async ({ provider, model, contents, openrouterApiKey, maxRetries = 3 }) => {
    if (!model) {
        throw new Error("Nom de modèle requis.");
    }
    if (provider === AI_PROVIDERS.OPENROUTER) {
        return await callOpenRouter(model, contents, openrouterApiKey, maxRetries);
    }
    // Default: Google Gemini
    return await callGemini(model, contents, maxRetries);
};

/**
 * Translates text via the configured provider (prompt identical to
 * aiService.translateWithGemini so behavior is unchanged on Gemini).
 */
export const translateWithAI = async ({ text, sourceLang, targetLang, model, provider, openrouterApiKey }) => {
    if (!model) {
        throw new Error("Model name is required for translation");
    }
    if (!text.trim()) return "";
    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Preserve formatting and paragraphs. Output ONLY the translation.

TEXT:
${text}`;

    const response = await callModel({
        provider,
        model,
        openrouterApiKey,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    return extractTextFromResponse(response);
};

/**
 * Lightweight connectivity test for the Settings window ("Tester la
 * connexion"). Sends a tiny prompt and measures the latency.
 * Never throws — always resolves with { ok, message, latencyMs }.
 */
export const testAIConnection = async ({ provider, model, openrouterApiKey }) => {
    const t0 = Date.now();
    try {
        if (!model) {
            return { ok: false, message: "⚠️ Aucun modèle configuré.", latencyMs: 0 };
        }
        const response = await callModel({
            provider,
            model,
            openrouterApiKey,
            maxRetries: 0,
            contents: [{ role: 'user', parts: [{ text: "Reply with exactly: OK" }] }]
        });
        const text = extractTextFromResponse(response);
        const latencyMs = Date.now() - t0;
        if (!text) {
            return { ok: false, message: "⚠️ Le modèle a répondu mais sans contenu exploitable.", latencyMs };
        }
        return {
            ok: true,
            message: `✅ Connexion réussie en ${latencyMs} ms — le modèle a répondu.`,
            latencyMs
        };
    } catch (err) {
        return { ok: false, message: `❌ ${err.message || 'Erreur inconnue'}`, latencyMs: Date.now() - t0 };
    }
};
