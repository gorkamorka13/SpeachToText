const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * Converts Gemini-style contents into OpenAI-compatible chat messages.
 * Returns null if the content cannot be represented for OpenRouter (e.g. audio).
 */
export const toOpenAIMessages = (contents) => {
    const messages = [];
    for (const c of contents || []) {
        const role = c.role === 'model' || c.role === 'assistant' ? 'assistant' : 'user';
        const parts = [];
        for (const p of c.parts || []) {
            if (p.text !== undefined && p.text !== null) {
                parts.push({ type: 'text', text: p.text });
            } else if (p.inlineData) {
                const { mimeType, data } = p.inlineData;
                if (mimeType && mimeType.startsWith('audio/')) {
                    throw new Error(
                        "OpenRouter ne supporte pas la transcription audio. " +
                        "Utilisez le moteur Gemini ou Whisper pour la transcription, " +
                        "et OpenRouter uniquement pour l'Analyse IA / la Traduction."
                    );
                }
                parts.push({
                    type: 'image_url',
                    image_url: { url: `data:${mimeType || 'image/png'};base64,${data}` }
                });
            }
        }
        if (parts.length) messages.push({ role, content: parts });
    }
    return messages;
};

/**
 * Calls OpenRouter (OpenAI-compatible REST API) with the given Gemini-style
 * contents, retrying on rate-limit errors (429) like callGemini does.
 * Returns a normalized Gemini-style response so extractTextFromResponse()
 * keeps working unchanged for both providers.
 */
export const callOpenRouter = async (modelName, contents, apiKey, maxRetries = 3) => {
    if (!apiKey || !String(apiKey).trim()) {
        throw new Error("Clé API OpenRouter manquante. Créez-en une gratuitement sur https://openrouter.ai/keys puis renseignez-la dans les Paramètres.");
    }
    if (!modelName) {
        throw new Error("Nom de modèle OpenRouter requis.");
    }

    let messages;
    try {
        messages = toOpenAIMessages(contents);
    } catch (err) {
        throw new Error(err.message);
    }

    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey.trim()}`,
                    'Content-Type': 'application/json',
                    // Optional attribution headers recommended by OpenRouter
                    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://localhost',
                    'X-Title': 'My Encounter Speech-to-Text'
                },
                body: JSON.stringify({ model: modelName, messages })
            });

            if (!response.ok) {
                let errorText = '';
                try { errorText = await response.text(); } catch (e) { /* ignore */ }
                const err = new Error(`[OpenRouter] HTTP ${response.status}: ${errorText.slice(0, 300)}`);
                err.status = response.status;
                throw err;
            }

            const data = await response.json();
            const choice = data.choices && data.choices[0];
            const content = choice && choice.message && choice.message.content;
            if (!content || !String(content).trim()) {
                throw new Error("OpenRouter a renvoyé une réponse vide.");
            }

            // Normalize to Gemini-style response (candidates/content/parts)
            return {
                candidates: [{
                    content: { parts: [{ text: content }] },
                    finishReason: choice.finish_reason === 'stop' || !choice.finish_reason ? 'STOP' : choice.finish_reason.toUpperCase()
                }],
                usageMetadata: data.usage ? {
                    promptTokenCount: data.usage.prompt_tokens || 0,
                    candidatesTokenCount: data.usage.completion_tokens || 0,
                    totalTokenCount: data.usage.total_tokens || 0
                } : undefined
            };
        } catch (err) {
            const isRateLimitError = err.status === 429 ||
                (err.message && err.message.includes('429')) ||
                (err.message && err.message.toLowerCase().includes('rate limit'));
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
