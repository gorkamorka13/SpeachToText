import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callGemini, extractTextFromResponse } from '../aiService';
import { callOpenRouter } from './openrouterProvider';
import {
    AI_PROVIDERS,
    callModel,
    translateWithAI,
    testAIConnection
} from './providerFactory';

// Both backends are mocked — only the dispatch logic is under test here
// (openrouterProvider and callGemini have their own dedicated test files).
// NOTE: the mock specifier must match the import in providerFactory.js
// ('../aiService'), resolved from the test file's own directory.
vi.mock('../aiService', () => ({
    callGemini: vi.fn(),
    extractTextFromResponse: vi.fn()
}));
vi.mock('./openrouterProvider', () => ({
    callOpenRouter: vi.fn()
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('callModel', () => {
    it('requires a model', async () => {
        await expect(callModel({ provider: 'gemini', model: '', contents: [] }))
            .rejects.toThrow('Nom de modèle requis');
    });

    it('dispatches to Gemini by default', async () => {
        callGemini.mockResolvedValue({ response: {} });
        const result = await callModel({
            provider: 'gemini',
            model: 'gemini-x',
            contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
        });

        expect(callGemini).toHaveBeenCalledWith('gemini-x', [{ role: 'user', parts: [{ text: 'hi' }] }], 3);
        expect(callOpenRouter).not.toHaveBeenCalled();
        expect(result).toEqual({ response: {} });
    });

    it('dispatches to OpenRouter when provider is openrouter', async () => {
        callOpenRouter.mockResolvedValue({ candidates: [] });
        await callModel({
            provider: AI_PROVIDERS.OPENROUTER,
            model: 'google/gemma-3-27b-it:free',
            contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
            openrouterApiKey: 'sk-or-test'
        });

        expect(callOpenRouter).toHaveBeenCalledWith(
            'google/gemma-3-27b-it:free',
            [{ role: 'user', parts: [{ text: 'hi' }] }],
            'sk-or-test',
            3
        );
        expect(callGemini).not.toHaveBeenCalled();
    });
});

describe('translateWithAI', () => {
    it('requires a model', async () => {
        await expect(translateWithAI({
            text: 'text', sourceLang: 'fr', targetLang: 'en',
            model: '', provider: 'gemini'
        })).rejects.toThrow('Model name is required');
    });

    it('returns "" for empty text without calling any provider', async () => {
        const result = await translateWithAI({
            text: '   ', sourceLang: 'fr', targetLang: 'en',
            model: 'gemini-x', provider: 'gemini'
        });
        expect(result).toBe('');
        expect(callGemini).not.toHaveBeenCalled();
    });

    it('sends the translation prompt through the provider and extracts the text', async () => {
        callGemini.mockResolvedValue({ response: {} });
        extractTextFromResponse.mockReturnValue('Hello world');

        const result = await translateWithAI({
            text: 'Bonjour le monde', sourceLang: 'fr', targetLang: 'en',
            model: 'gemini-x', provider: 'gemini'
        });

        expect(result).toBe('Hello world');
        const [model, contents] = callGemini.mock.calls[0];
        expect(model).toBe('gemini-x');
        expect(contents[0].parts[0].text).toContain('Translate the following text from fr to en');
        expect(contents[0].parts[0].text).toContain('Bonjour le monde');
    });
});

describe('testAIConnection', () => {
    it('reports success with latency on a valid configuration', async () => {
        callGemini.mockResolvedValue({ response: {} });
        extractTextFromResponse.mockReturnValue('OK');

        const result = await testAIConnection({ provider: 'gemini', model: 'gemini-x' });

        expect(result.ok).toBe(true);
        expect(result.message).toContain('Connexion réussie');
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('reports failure without throwing when the provider rejects', async () => {
        callGemini.mockRejectedValue(new Error('Clé API Gemini manquante'));

        const result = await testAIConnection({ provider: 'gemini', model: 'gemini-x' });

        expect(result.ok).toBe(false);
        expect(result.message).toContain('Clé API Gemini manquante');
    });

    it('fails fast when no model is configured', async () => {
        const result = await testAIConnection({ provider: 'gemini', model: '' });

        expect(result.ok).toBe(false);
        expect(result.message).toContain('Aucun modèle');
        expect(callGemini).not.toHaveBeenCalled();
    });

    it('fails when the model answers with no usable content', async () => {
        callGemini.mockResolvedValue({ response: {} });
        extractTextFromResponse.mockReturnValue('');

        const result = await testAIConnection({ provider: 'gemini', model: 'gemini-x' });

        expect(result.ok).toBe(false);
        expect(result.message).toContain('sans contenu exploitable');
    });
});
