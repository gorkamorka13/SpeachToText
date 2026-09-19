import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsModal from './SettingsModal';

// Never hit the network from a test — the connection tester is mocked.
vi.mock('../services/providers/providerFactory', () => ({
    testAIConnection: vi.fn()
}));

import { testAIConnection } from '../services/providers/providerFactory';

const baseProps = {
    show: true,
    onClose: vi.fn(),
    aiModel: 'gemini-3.1-flash-lite',
    setAiModel: vi.fn(),
    aiInstructions: 'instructions',
    setAiInstructions: vi.fn(),
    pdfJustify: true,
    setPdfJustify: vi.fn(),
    transcriptionEngine: 'google',
    setTranscriptionEngine: vi.fn(),
    whisperUrl: 'http://localhost:5000/transcribe',
    setWhisperUrl: vi.fn(),
    aiProvider: 'gemini',
    setAiProvider: vi.fn(),
    openrouterApiKey: '',
    setOpenrouterApiKey: vi.fn(),
    openrouterModel: 'google/gemma-3-27b-it:free',
    setOpenrouterModel: vi.fn(),
    geminiApiKey: '',
    setGeminiApiKey: vi.fn()
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe('SettingsModal', () => {
    it('renders nothing when show is false', () => {
        const { container } = render(<SettingsModal {...baseProps} show={false} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the provider selector and Gemini settings by default', () => {
        render(<SettingsModal {...baseProps} />);
        // getByDisplayValue on a <select> matches the selected option's TEXT
        expect(screen.getByDisplayValue(/palier gratuit, modèles Flash/)).toBeInTheDocument();
        // Gemini key field (password) is visible, OpenRouter's is not
        expect(screen.getByPlaceholderText(/Collez votre clé gratuite AI Studio/i)).toBeInTheDocument();
    });

    it('switches to OpenRouter settings when the provider changes', () => {
        render(<SettingsModal {...baseProps} />);
        fireEvent.change(screen.getByDisplayValue(/palier gratuit, modèles Flash/), { target: { value: 'openrouter' } });

        expect(baseProps.setAiProvider).toHaveBeenCalledWith('openrouter');
    });

    it('shows the OpenRouter key field when provider is openrouter', () => {
        render(<SettingsModal {...baseProps} aiProvider="openrouter" />);
        expect(screen.getByPlaceholderText('sk-or-v1-...')).toBeInTheDocument();
        expect(screen.getByDisplayValue(/Gemma 3 27B/)).toBeInTheDocument();
    });

    it('displays the connection test result on success', async () => {
        testAIConnection.mockResolvedValue({ ok: true, message: '✅ Connexion réussie en 120 ms', latencyMs: 120 });
        render(<SettingsModal {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Tester la connexion/i }));

        await waitFor(() => {
            expect(screen.getByText(/Connexion réussie/i)).toBeInTheDocument();
        });
        expect(testAIConnection).toHaveBeenCalledWith(expect.objectContaining({
            provider: 'gemini',
            model: 'gemini-3.1-flash-lite'
        }));
    });

    it('displays the connection test error on failure', async () => {
        testAIConnection.mockResolvedValue({ ok: false, message: '❌ Clé manquante', latencyMs: 0 });
        render(<SettingsModal {...baseProps} />);

        fireEvent.click(screen.getByRole('button', { name: /Tester la connexion/i }));

        await waitFor(() => {
            expect(screen.getByText(/Clé manquante/i)).toBeInTheDocument();
        });
    });
});
