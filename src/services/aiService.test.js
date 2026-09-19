import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import {
    callGemini,
    extractTextFromResponse,
    fileToGenerativePart,
    translateWithGemini,
    transcribeWithWhisper,
    setGeminiApiKey,
    getGeminiApiKey
} from './aiService';

// The whole Gemini SDK is mocked — no network call is ever made
// (same convention as Screen2LaTeX's test suite).
vi.mock('@google/genai', () => ({ GoogleGenAI: vi.fn() }));

const mockModel = { generateContent: vi.fn() };
const mockGenAI = {
    getGenerativeModel: vi.fn(() => mockModel),
    models: { generateContent: vi.fn() },
};

const CONTENTS = [{ role: 'user', parts: [{ text: 'hello' }] }];

beforeEach(() => {
    vi.clearAllMocks();
    GoogleGenAI.mockImplementation(() => mockGenAI);
    mockGenAI.getGenerativeModel = vi.fn(() => mockModel);
    setGeminiApiKey(null);
});

afterEach(() => {
    vi.useRealTimers();
    setGeminiApiKey(null);
});

describe('callGemini', () => {
    it('throws when no API key is configured', async () => {
        await expect(callGemini('gemini-x', CONTENTS)).rejects.toThrow('Clé API Gemini manquante');
    });

    it('sends model name, safety settings and contents to the SDK', async () => {
        setGeminiApiKey('test-key');
        mockModel.generateContent.mockResolvedValue({ response: { text: () => 'ok' } });

        const result = await callGemini('gemini-x', CONTENTS);

        expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
            model: 'gemini-x',
            safetySettings: expect.any(Array)
        }));
        expect(mockModel.generateContent).toHaveBeenCalledWith({ contents: CONTENTS });
        expect(result).toEqual({ text: expect.any(Function) });
    });

    it('retries on 429 rate-limit errors and succeeds', async () => {
        setGeminiApiKey('test-key');
        vi.useFakeTimers();
        mockModel.generateContent
            .mockRejectedValueOnce(Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { status: 429 }))
            .mockResolvedValueOnce({ response: { text: () => 'ok after retry' } });

        const promise = callGemini('gemini-x', CONTENTS);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(mockModel.generateContent).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ text: expect.any(Function) });
    });

    it('gives up after max retries when 429 persists', async () => {
        setGeminiApiKey('test-key');
        vi.useFakeTimers();
        mockModel.generateContent.mockRejectedValue(
            Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { status: 429 })
        );

        // Attach the rejection expectation BEFORE running the timers, so the
        // rejection never lands as an unhandled promise rejection.
        const expectation = expect(callGemini('gemini-x', CONTENTS, 1)).rejects.toThrow('429');
        await vi.runAllTimersAsync();
        await expectation;

        // initial attempt + 1 retry
        expect(mockModel.generateContent).toHaveBeenCalledTimes(2);
    });

    it('does not retry on non-rate-limit errors', async () => {
        setGeminiApiKey('test-key');
        mockModel.generateContent.mockRejectedValue(new Error('invalid argument'));

        await expect(callGemini('gemini-x', CONTENTS)).rejects.toThrow('invalid argument');
        expect(mockModel.generateContent).toHaveBeenCalledTimes(1);
    });

    it('falls back to the new SDK shape (genAI.models.generateContent)', async () => {
        setGeminiApiKey('test-key');
        mockGenAI.getGenerativeModel = undefined; // new SDK has no getGenerativeModel
        mockGenAI.models.generateContent.mockResolvedValue({
            candidates: [{ content: { parts: [{ text: 'new sdk' }] } }]
        });

        const result = await callGemini('gemini-x', CONTENTS);

        expect(mockGenAI.models.generateContent).toHaveBeenCalledWith(expect.objectContaining({
            model: 'gemini-x',
            contents: CONTENTS
        }));
        expect(result).toEqual({
            candidates: [{ content: { parts: [{ text: 'new sdk' }] } }]
        });
    });

    it('uses the user-supplied key override before the env key', async () => {
        setGeminiApiKey('user-free-key');
        mockModel.generateContent.mockResolvedValue({ response: { text: () => 'ok' } });

        await callGemini('gemini-x', CONTENTS);

        expect(GoogleGenAI).toHaveBeenCalledWith('user-free-key');
    });
});

describe('getGeminiApiKey / setGeminiApiKey', () => {
    it('returns null when no key is configured', () => {
        setGeminiApiKey(null);
        expect(getGeminiApiKey()).toBeNull();
    });

    it('returns the trimmed key configured in Settings', () => {
        setGeminiApiKey('  user-key  ');
        expect(getGeminiApiKey()).toBe('user-key');
    });

    it('clears the override with null or empty values', () => {
        setGeminiApiKey('user-key');
        setGeminiApiKey('   ');
        expect(getGeminiApiKey()).toBeNull();
    });
});
describe('extractTextFromResponse', () => {
    it('returns "" for null/undefined', () => {
        expect(extractTextFromResponse(null)).toBe('');
        expect(extractTextFromResponse(undefined)).toBe('');
    });

    it('extracts from a .text() function (old SDK response)', () => {
        expect(extractTextFromResponse({ text: () => 'bonjour' })).toBe('bonjour');
    });

    it('extracts from a plain .text string', () => {
        expect(extractTextFromResponse({ text: 'bonjour' })).toBe('bonjour');
    });

    it('joins candidates content parts', () => {
        const response = {
            candidates: [{
                finishReason: 'STOP',
                content: { parts: [{ text: 'Hello ' }, { text: 'World' }, { notText: true }] }
            }]
        };
        expect(extractTextFromResponse(response)).toBe('Hello World');
    });

    it('extracts from an OpenAI-style choices response', () => {
        expect(extractTextFromResponse({
            choices: [{ message: { content: 'openai text' } }]
        })).toBe('openai text');
    });

    it('returns "" (does not crash) on a SAFETY-blocked candidates response', () => {
        // extractTextFromResponse catches internally and returns ''
        const response = { candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] };
        expect(extractTextFromResponse(response)).toBe('');
    });

    it('returns "" for an unknown shape', () => {
        expect(extractTextFromResponse({ something: 'else' })).toBe('');
    });
});

describe('fileToGenerativePart', () => {
    it('converts a Blob to base64 inlineData', async () => {
        const blob = new Blob(['hello world'], { type: 'audio/wav' });
        const part = await fileToGenerativePart(blob);
        expect(part.inlineData.mimeType).toBe('audio/wav');
        // Decode with Buffer (jsdom's atob/btoa are unreliable in this env)
        expect(Buffer.from(part.inlineData.data, 'base64').toString('utf8')).toBe('hello world');
    });

    it('normalizes video/webm to audio/webm', async () => {
        const blob = new Blob(['data'], { type: 'video/webm' });
        const part = await fileToGenerativePart(blob);
        expect(part.inlineData.mimeType).toBe('audio/webm');
    });

    it('rejects non-Blob input', async () => {
        await expect(fileToGenerativePart('not a blob')).rejects.toThrow('Blob audio valide');
    });

    it('rejects an empty Blob', async () => {
        await expect(fileToGenerativePart(new Blob([], { type: 'audio/wav' })))
            .rejects.toThrow('fichier audio est vide');
    });
});

describe('transcribeWithWhisper', () => {
    it('returns the transcription text on success', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ text: 'Bonjour le monde' })
        });
        vi.stubGlobal('fetch', fetchMock);

        const blob = new Blob(['audio'], { type: 'audio/wav' });
        const text = await transcribeWithWhisper(blob, 'http://localhost:5000/transcribe');

        expect(text).toBe('Bonjour le monde');
        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:5000/transcribe',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('throws a readable error on HTTP failure', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Server Error',
            text: () => Promise.resolve('boom')
        }));

        const blob = new Blob(['audio'], { type: 'audio/wav' });
        await expect(transcribeWithWhisper(blob)).rejects.toThrow('Erreur');
    });

    it('gives a friendly hint when the server is unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

        const blob = new Blob(['audio'], { type: 'audio/wav' });
        await expect(transcribeWithWhisper(blob)).rejects.toThrow('whisper_server.py');
    });

    it('sends the X-Whisper-Token header when a token is provided', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ text: 'Bonjour' })
        });
        vi.stubGlobal('fetch', fetchMock);

        const blob = new Blob(['audio'], { type: 'audio/wav' });
        await transcribeWithWhisper(blob, 'http://localhost:5000/transcribe', 'secret123');

        const [calledUrl, options] = fetchMock.mock.calls[0];
        expect(calledUrl).toBe('http://localhost:5000/transcribe');
        expect(options.headers).toEqual({ 'X-Whisper-Token': 'secret123' });
    });

    it('does not send any token header when none is provided', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ text: 'Bonjour' })
        });
        vi.stubGlobal('fetch', fetchMock);

        const blob = new Blob(['audio'], { type: 'audio/wav' });
        await transcribeWithWhisper(blob);

        expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
    });

    it('rejects when the transcription is empty', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ text: '   ' })
        }));

        const blob = new Blob(['audio'], { type: 'audio/wav' });
        await expect(transcribeWithWhisper(blob)).rejects.toThrow('transcription est vide');
    });
});

describe('translateWithGemini', () => {
    it('requires a model name', async () => {
        await expect(translateWithGemini('text', 'fr', 'en', '')).rejects.toThrow('Model name is required');
    });

    it('returns "" for empty text without calling the API', async () => {
        const result = await translateWithGemini('   ', 'fr', 'en', 'gemini-x');
        expect(result).toBe('');
        expect(mockModel.generateContent).not.toHaveBeenCalled();
    });

    it('sends the translation prompt and returns the translated text', async () => {
        setGeminiApiKey('test-key');
        mockModel.generateContent.mockResolvedValue({ response: { text: () => 'Hello world' } });

        const result = await translateWithGemini('Bonjour le monde', 'fr', 'en', 'gemini-x');

        expect(result).toBe('Hello world');
        const call = mockModel.generateContent.mock.calls[0][0];
        const prompt = call.contents[0].parts[0].text;
        expect(prompt).toContain('Translate the following text from fr to en');
        expect(prompt).toContain('Bonjour le monde');
    });
});

