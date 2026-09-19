import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toOpenAIMessages, callOpenRouter } from './openrouterProvider';

describe('toOpenAIMessages', () => {
    it('maps text parts to OpenAI text content', () => {
        const messages = toOpenAIMessages([
            { role: 'user', parts: [{ text: 'Bonjour' }] }
        ]);
        expect(messages).toEqual([
            { role: 'user', content: [{ type: 'text', text: 'Bonjour' }] }
        ]);
    });

    it('maps the "model" role to the "assistant" role', () => {
        const messages = toOpenAIMessages([
            { role: 'model', parts: [{ text: 'Réponse' }] }
        ]);
        expect(messages[0].role).toBe('assistant');
    });

    it('maps image inlineData to a base64 data URI', () => {
        const messages = toOpenAIMessages([
            { role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: 'AAAA' } }] }
        ]);
        expect(messages[0].content[0]).toEqual({
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,AAAA' }
        });
    });

    it('rejects audio inlineData with a clear explanation', () => {
        expect(() => toOpenAIMessages([
            { role: 'user', parts: [{ inlineData: { mimeType: 'audio/webm', data: 'AAAA' } }] }
        ])).toThrow('ne supporte pas la transcription audio');
    });
});

describe('callOpenRouter', () => {
    const OK_RESPONSE = {
        choices: [{ message: { content: 'Hello from OpenRouter' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
    };

    beforeEach(() => {
        vi.unstubAllGlobals();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('throws when the API key is missing', async () => {
        await expect(callOpenRouter('m', [{ role: 'user', parts: [{ text: 'hi' }] }], '  '))
            .rejects.toThrow('Clé API OpenRouter manquante');
    });

    it('throws when the model is missing', async () => {
        await expect(callOpenRouter('', [{ role: 'user', parts: [{ text: 'hi' }] }], 'sk-or-x'))
            .rejects.toThrow('Nom de modèle OpenRouter requis');
    });

    it('calls the OpenRouter REST API and normalizes the response', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(OK_RESPONSE)
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await callOpenRouter(
            'google/gemma-3-27b-it:free',
            [{ role: 'user', parts: [{ text: 'hi' }] }],
            'sk-or-test'
        );

        expect(fetchMock).toHaveBeenCalledWith(
            'https://openrouter.ai/api/v1/chat/completions',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer sk-or-test'
                })
            })
        );
        expect(result.candidates[0].content.parts[0].text).toBe('Hello from OpenRouter');
        expect(result.candidates[0].finishReason).toBe('STOP');
        expect(result.usageMetadata).toEqual({
            promptTokenCount: 5,
            candidatesTokenCount: 3,
            totalTokenCount: 8
        });
    });

    it('throws with the HTTP status on a non-ok response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            text: () => Promise.resolve('Unauthorized')
        }));

        await expect(callOpenRouter('m', [{ role: 'user', parts: [{ text: 'hi' }] }], 'bad-key', 0))
            .rejects.toThrow('HTTP 401');
    });

    it('retries on 429 rate-limit errors and succeeds', async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                text: () => Promise.resolve('RATE_LIMIT exceeded')
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(OK_RESPONSE)
            });
        vi.stubGlobal('fetch', fetchMock);

        const promise = callOpenRouter('m', [{ role: 'user', parts: [{ text: 'hi' }] }], 'sk-or-test');
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(result.candidates[0].content.parts[0].text).toBe('Hello from OpenRouter');
    });

    it('rejects a response with empty content', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: '   ' } }] })
        }));

        await expect(callOpenRouter('m', [{ role: 'user', parts: [{ text: 'hi' }] }], 'sk-or-test', 0))
            .rejects.toThrow('réponse vide');
    });
});
