import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePDF, downloadDOCX } from './exportService';
import { saveAs } from 'file-saver';
import { __fakeDocs } from 'jspdf';

// Mock the file download and jsPDF (jsPDF v4 keeps its methods on instances,
// which makes spyOn/instanceof unreliable across module instances) — the
// FakeDoc records the calls so the generation LOGIC stays fully exercised.
vi.mock('jspdf', () => {
    const docs = [];
    class FakeDoc {
        constructor() {
            this.pages = 1;
            this.fontCalls = [];
            this.textCalls = [];
            this.internal = {
                pageSize: { getWidth: () => 210, getHeight: () => 297 },
                getNumberOfPages: () => this.pages,
            };
            docs.push(this);
        }
        addFileToVFS() { }
        addFont() { }
        setFontSize() { }
        setTextColor() { }
        setFont(name, style) { this.fontCalls.push(`${name}-${style || 'normal'}`); }
        text(text) { this.textCalls.push(String(text)); }
        getTextWidth() { return 5; }
        splitTextToSize(text) { return [String(text)]; }
        addPage() { this.pages += 1; }
        setPage() { }
    }
    return { jsPDF: FakeDoc, __fakeDocs: docs };
});

// Only the file download is mocked otherwise — docx really generates its
// document in jsdom (same philosophy as Screen2LaTeX: no network, real logic).
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

const lastDoc = () => __fakeDocs[__fakeDocs.length - 1];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('generatePDF', () => {
    it('returns null when there is nothing to export', () => {
        expect(generatePDF({ transcript: '', aiResult: '' })).toBeNull();
        expect(generatePDF({ transcript: null, aiResult: null })).toBeNull();
    });

    it('returns a single-page document for a short transcript', () => {
        const doc = generatePDF({ transcript: 'Bonjour le monde', pdfJustify: false });
        expect(lastDoc()).toBe(doc);
        expect(doc.pages).toBe(1);
        expect(doc.textCalls).toContain('Bonjour le monde');
    });

    it('adds pages when the transcript is long', () => {
        const longText = Array.from({ length: 80 }, (_, i) => `Ligne numero ${i} du transcript de test.`).join('\n');
        const doc = generatePDF({ transcript: longText, pdfJustify: false });
        expect(doc.pages).toBeGreaterThan(1);
    });

    it('renders Arabic text with the Amiri font', () => {
        const doc = generatePDF({ transcript: 'مرحبا بالعالم', pdfJustify: false });
        expect(doc).toBeDefined();
        expect(doc.fontCalls).toContain('Amiri-normal');
    });

    it('writes the Encounter heading when aiResult is provided', () => {
        generatePDF({ transcript: 'Bonjour le monde', aiResult: 'Analyse IA du texte', pdfJustify: false });
        expect(lastDoc().textCalls).toContain('Encounter');
    });
});

describe('downloadDOCX', () => {
    it('does not call saveAs when there is nothing to export', async () => {
        await downloadDOCX({ transcript: '', aiResult: '' });
        expect(saveAs).not.toHaveBeenCalled();
    });

    it('saves a non-empty .docx Blob with the custom filename', async () => {
        await downloadDOCX({
            transcript: 'Bonjour le monde',
            aiResult: 'Analyse de l\'agent IA',
            translatedTranscript: 'Hello world',
            enableTranslation: true,
            targetLanguage: 'en',
            aiModel: 'gemini-x',
            pdfJustify: true,
            customFilename: 'mon-rapport'
        });

        expect(saveAs).toHaveBeenCalledTimes(1);
        const [blob, fileName] = saveAs.mock.calls[0];
        expect(fileName).toBe('mon-rapport.docx');
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.size).toBeGreaterThan(0);
    });

    it('falls back to a dated default filename without customFilename', async () => {
        await downloadDOCX({ transcript: 'Bonjour', aiModel: 'gemini-x' });

        expect(saveAs).toHaveBeenCalledTimes(1);
        const [blob, fileName] = saveAs.mock.calls[0];
        expect(fileName).toMatch(/^encounter-report-\d{4}-\d{2}-\d{2}\.docx$/);
        expect(blob).toBeInstanceOf(Blob);
    });
});
