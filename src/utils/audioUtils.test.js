import { describe, it, expect, vi } from 'vitest';
import {
    getRmsLevel,
    LEVEL_SCALE,
    parseSilenceTimeout,
    parseMaxRecordingMinutes,
    maxRecordingSeconds,
    isRecordingLimitReached,
    formatRecordingLimit,
    SILENCE_TIMEOUT_OPTIONS,
    DEFAULT_SILENCE_TIMEOUT,
    DEFAULT_MAX_RECORDING_MINUTES,
    AUDIO_SOURCE_OPTIONS,
    DEFAULT_AUDIO_SOURCE,
    parseAudioSource,
    needsMic,
    needsSystemAudio,
    describeAudioSource,
    getDisplayAudioConstraints,
    getMicConstraints,
    DEFAULT_AUDIO_INPUT,
    isLoopbackInputLabel,
    listAudioInputs,
    encodeAudioChoice,
    decodeAudioChoice,
    describeAudioInput,
    trimSilence,
    getAudioExtension,
    normalizeAudioMimeType,
    SILENCE_THRESHOLD_OPTIONS,
    DEFAULT_SILENCE_THRESHOLD,
    parseSilenceThreshold
} from './audioUtils';

describe('sources audio', () => {
    it('propose micro, système et les deux, avec le micro par défaut', () => {
        expect(AUDIO_SOURCE_OPTIONS.map(o => o.value)).toEqual(['mic', 'system', 'both']);
        expect(DEFAULT_AUDIO_SOURCE).toBe('mic');
    });

    it('indique quand le micro ou l\'audio système sont nécessaires', () => {
        expect(needsMic('mic')).toBe(true);
        expect(needsMic('both')).toBe(true);
        expect(needsMic('system')).toBe(false);

        expect(needsSystemAudio('system')).toBe(true);
        expect(needsSystemAudio('both')).toBe(true);
        expect(needsSystemAudio('mic')).toBe(false);
    });

    it('parse la source mémorisée et retombe sur le micro', () => {
        expect(parseAudioSource('system')).toBe('system');
        expect(parseAudioSource('both')).toBe('both');
        expect(parseAudioSource('micro')).toBe('mic');
        expect(parseAudioSource(null)).toBe('mic');
        expect(parseAudioSource('')).toBe('mic');
    });

    it('donne un libellé lisible à chaque source', () => {
        expect(describeAudioSource('mic')).toMatch(/Microphone/);
        expect(describeAudioSource('system')).toMatch(/syst/);
        expect(describeAudioSource('inconnu')).toMatch(/Microphone/);
    });

    it('exige une piste vidéo pour capturer l\'audio d\'un onglet', () => {
        const constraints = getDisplayAudioConstraints();
        expect(constraints.video).toBe(true);
        expect(constraints.audio).toBe(true);
        expect(constraints.systemAudio).toBe('include');
    });
});

describe('contraintes du microphone', () => {
    it('coupe le contrôle automatique du gain (il réécrit le volume de Windows)', () => {
        const { audio } = getMicConstraints();
        expect(audio.autoGainControl).toBe(false);
    });

    it("laisse l'annulation d'écho et la suppression de bruit à leur valeur par défaut", () => {
        const { audio } = getMicConstraints();
        expect(audio).not.toHaveProperty('echoCancellation');
        expect(audio).not.toHaveProperty('noiseSuppression');
    });

    it('vise exactement l\'entrée choisie, et le micro par défaut sans choix', () => {
        expect(getMicConstraints().audio).not.toHaveProperty('deviceId');
        expect(getMicConstraints(DEFAULT_AUDIO_INPUT).audio).not.toHaveProperty('deviceId');
        expect(getMicConstraints('abc123').audio.deviceId).toEqual({ exact: 'abc123' });
    });

    it('coupe le traitement de la voix pour une entrée « boucle système »', () => {
        const { audio } = getMicConstraints('abc123', { raw: true });
        expect(audio.echoCancellation).toBe(false);
        expect(audio.noiseSuppression).toBe(false);
        expect(audio.autoGainControl).toBe(false);
    });
});

describe('entrées audio', () => {
    it('reconnaît les entrées qui capturent le son du système', () => {
        expect(isLoopbackInputLabel('Stereo Mix (Realtek(R) Audio)')).toBe(true);
        expect(isLoopbackInputLabel('Mixage stéréo (Realtek(R) Audio)')).toBe(true);
        expect(isLoopbackInputLabel('CABLE Output (VB-Audio Virtual Cable)')).toBe(true);
        expect(isLoopbackInputLabel('Microphone (Realtek(R) Audio)')).toBe(false);
        expect(isLoopbackInputLabel('Microphone (UGREEN Camera)')).toBe(false);
        expect(isLoopbackInputLabel('')).toBe(false);
        expect(isLoopbackInputLabel(undefined)).toBe(false);
    });

    it('ne garde que les entrées audio réelles', () => {
        const devices = [
            { kind: 'audioinput', deviceId: 'default', label: 'Par défaut - Microphone' },
            { kind: 'audioinput', deviceId: 'communications', label: 'Communications' },
            { kind: 'audioinput', deviceId: 'mic1', label: 'Microphone (Realtek)' },
            { kind: 'audioinput', deviceId: 'mix1', label: 'Stereo Mix (Realtek)' },
            { kind: 'audiooutput', deviceId: 'spk1', label: 'Speakers' },
            { kind: 'videoinput', deviceId: 'cam1', label: 'Camera' }
        ];
        expect(listAudioInputs(devices)).toEqual([
            { id: 'mic1', label: 'Microphone (Realtek)' },
            { id: 'mix1', label: 'Stereo Mix (Realtek)' }
        ]);
    });

    it('nomme les entrées sans libellé (micro pas encore autorisé)', () => {
        const devices = [{ kind: 'audioinput', deviceId: 'x', label: '' }];
        expect(listAudioInputs(devices)).toEqual([{ id: 'x', label: 'Entrée audio 1' }]);
        expect(listAudioInputs(null)).toEqual([]);
    });
});

describe('limites d\'enregistrement', () => {
    it('propose 30, 40 et 50 s avec 40 s par défaut', () => {
        expect(SILENCE_TIMEOUT_OPTIONS).toEqual([30, 40, 50]);
        expect(DEFAULT_SILENCE_TIMEOUT).toBe(40);
        expect(DEFAULT_MAX_RECORDING_MINUTES).toBe(60);
    });

    it('parse le délai de silence et retombe sur le défaut', () => {
        expect(parseSilenceTimeout('30')).toBe(30);
        expect(parseSilenceTimeout('50')).toBe(50);
        expect(parseSilenceTimeout(null)).toBe(40);
        expect(parseSilenceTimeout('45')).toBe(40); // valeur hors liste
        expect(parseSilenceTimeout('abc')).toBe(40);
    });

    it('parse la durée maximale et retombe sur 1 heure', () => {
        expect(parseMaxRecordingMinutes('15')).toBe(15);
        expect(parseMaxRecordingMinutes('120')).toBe(120);
        expect(parseMaxRecordingMinutes('0')).toBe(0); // illimité est une valeur valide
        expect(parseMaxRecordingMinutes(null)).toBe(60);
        expect(parseMaxRecordingMinutes('')).toBe(60);
        expect(parseMaxRecordingMinutes('42')).toBe(60); // valeur hors liste
        expect(parseMaxRecordingMinutes('-5')).toBe(60);
    });

    it('convertit la limite en secondes', () => {
        expect(maxRecordingSeconds(60)).toBe(3600);
        expect(maxRecordingSeconds(15)).toBe(900);
        expect(maxRecordingSeconds(0)).toBe(Infinity);
    });

    it('detecte le depassement de la limite', () => {
        expect(isRecordingLimitReached(3599, 60)).toBe(false);
        expect(isRecordingLimitReached(3600, 60)).toBe(true);
        expect(isRecordingLimitReached(99999, 0)).toBe(false); // illimité
        expect(isRecordingLimitReached(600, 10)).toBe(true);
    });

    it('formate la limite pour les notifications', () => {
        expect(formatRecordingLimit(60)).toBe('1 heure');
        expect(formatRecordingLimit(120)).toBe('2 heures');
        expect(formatRecordingLimit(90)).toBe('1 h 30');
        expect(formatRecordingLimit(30)).toBe('30 min');
        expect(formatRecordingLimit(0)).toBe('illimité');
    });
});

describe('getRmsLevel', () => {
    // Sinusoïde d'amplitude crête `peak` : RMS = peak / √2
    const sine = (peak, length = 2048) =>
        Float32Array.from({ length }, (_, i) => peak * Math.sin((2 * Math.PI * i) / 64));

    it('returns 0 for a missing or empty array', () => {
        expect(getRmsLevel(null)).toBe(0);
        expect(getRmsLevel(undefined)).toBe(0);
        expect(getRmsLevel(new Float32Array(0))).toBe(0);
    });

    it('returns 0 for a perfect silence and below the -60 dB floor', () => {
        expect(getRmsLevel(new Float32Array(2048))).toBe(0);
        expect(getRmsLevel(sine(0.0005))).toBe(0); // ≈ -69 dBFS
    });

    it('never exceeds the meter scale, even on a full-scale signal', () => {
        expect(getRmsLevel(new Float32Array(2048).fill(1))).toBe(LEVEL_SCALE);
    });

    it('rises with the signal amplitude', () => {
        const quiet = getRmsLevel(sine(0.01)); // ≈ -43 dBFS
        const speech = getRmsLevel(sine(0.05)); // ≈ -29 dBFS
        const loud = getRmsLevel(sine(0.3)); // ≈ -13 dBFS
        expect(quiet).toBeGreaterThan(0);
        expect(speech).toBeGreaterThan(quiet);
        expect(loud).toBeGreaterThan(speech);
    });

    it('gives a normal speech level a clearly visible reading (regression : niveau trop faible)', () => {
        // Voix normale ≈ -30 dBFS RMS → plus de la moitié du VU-mètre
        // (l'ancienne moyenne du spectre restait sous ~10 % dans ce cas).
        const speech = getRmsLevel(sine(0.0447 * Math.SQRT2)); // RMS 0,0447 = -27 dBFS
        expect(speech / LEVEL_SCALE).toBeGreaterThan(0.5);
    });

    it('is 6 dB per doubling of the amplitude', () => {
        const a = getRmsLevel(sine(0.02));
        const b = getRmsLevel(sine(0.04));
        // 6,02 dB sur une plage de 54 dB, échelle 128
        expect(b - a).toBeCloseTo((6.02 / 54) * LEVEL_SCALE, 1);
    });
});

describe('trimSilence', () => {
    it('rogne le silence en début/fin avec le contexte créé en interne (régression : contexte null)', async () => {
        // 0,0 = silence ; 0,5 = signal
        const samples = new Float32Array([0, 0, 0.5, 0.5, 0.5, 0, 0]);
        const decoded = {
            numberOfChannels: 1,
            sampleRate: 8000,
            getChannelData: () => samples
        };
        const trimmed = { numberOfChannels: 1, length: 3, sampleRate: 8000, getChannelData: () => new Float32Array(3), copyToChannel: vi.fn() };
        const context = {
            state: 'running',
            decodeAudioData: vi.fn().mockResolvedValue(decoded),
            createBuffer: vi.fn().mockReturnValue(trimmed),
            close: vi.fn().mockResolvedValue()
        };
        vi.stubGlobal('AudioContext', vi.fn(() => context));

        const blob = { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) };
        const result = await trimSilence(blob);

        expect(context.createBuffer).toHaveBeenCalledWith(1, 3, 8000);
        expect(result).not.toBe(blob);
        expect(result.type).toBe('audio/wav');
        expect(context.close).toHaveBeenCalled();
        vi.unstubAllGlobals();
    });
});

describe('format du fichier audio', () => {
    it('retire les paramètres de codec du type MIME', () => {
        expect(normalizeAudioMimeType('audio/webm;codecs=opus')).toBe('audio/webm');
        expect(normalizeAudioMimeType('Audio/MP4')).toBe('audio/mp4');
        expect(normalizeAudioMimeType('')).toBe('audio/webm');
        expect(normalizeAudioMimeType(undefined)).toBe('audio/webm');
    });

    it("déduit l'extension du type MIME (repli sur webm)", () => {
        expect(getAudioExtension({ type: 'audio/webm;codecs=opus' })).toBe('webm');
        expect(getAudioExtension({ type: 'audio/mpeg' })).toBe('mp3');
        expect(getAudioExtension({ type: 'audio/x-wav' })).toBe('wav');
        expect(getAudioExtension({ type: 'audio/mp4' })).toBe('m4a');
        expect(getAudioExtension({ type: 'application/octet-stream' })).toBe('webm');
        expect(getAudioExtension(null)).toBe('webm');
    });

    it("privilégie l'extension du fichier importé", () => {
        expect(getAudioExtension({ name: 'Réunion.MP3', type: '' })).toBe('mp3');
        expect(getAudioExtension({ name: 'note', type: 'audio/ogg' })).toBe('ogg');
    });
});

describe('seuil de silence', () => {
    it('propose des seuils croissants dont le défaut (24, ≈ -50 dBFS)', () => {
        const values = SILENCE_THRESHOLD_OPTIONS.map(o => o.value);
        expect(values).toEqual([...values].sort((a, b) => a - b));
        expect(values).toContain(DEFAULT_SILENCE_THRESHOLD);
        expect(DEFAULT_SILENCE_THRESHOLD).toBe(24);
        expect(Math.max(...values)).toBeLessThan(LEVEL_SCALE);
    });

    it('lit la valeur mémorisée avec repli sur le défaut', () => {
        expect(parseSilenceThreshold('43')).toBe(43);
        expect(parseSilenceThreshold(59)).toBe(59);
        expect(parseSilenceThreshold(null)).toBe(24);
        expect(parseSilenceThreshold('10')).toBe(24); // ancienne échelle (moyenne du spectre) : repli sur le défaut
        expect(parseSilenceThreshold('abc')).toBe(24);
    });
});

describe('liste unique source audio', () => {
    it("encode la source et l'entrée dans une seule valeur", () => {
        expect(encodeAudioChoice('mic', '')).toBe('mic:');
        expect(encodeAudioChoice('mic', 'mix1')).toBe('mic:mix1');
        expect(encodeAudioChoice('mic')).toBe('mic:');
        expect(encodeAudioChoice('system', 'mix1')).toBe('system');
        expect(encodeAudioChoice('both', 'mix1')).toBe('both');
    });

    it('décode la valeur (aller-retour sans perte)', () => {
        expect(decodeAudioChoice('mic:')).toEqual({ source: 'mic', inputId: '' });
        expect(decodeAudioChoice('mic:mix1')).toEqual({ source: 'mic', inputId: 'mix1' });
        expect(decodeAudioChoice('system')).toEqual({ source: 'system' });
        expect(decodeAudioChoice('both')).toEqual({ source: 'both' });
        // Un identifiant d'entrée peut lui-même contenir « : »
        expect(decodeAudioChoice(encodeAudioChoice('mic', 'a:b'))).toEqual({ source: 'mic', inputId: 'a:b' });
    });

    it("retombe sur l'entrée par défaut pour une valeur inconnue", () => {
        expect(decodeAudioChoice('valeur inconnue')).toEqual({ source: 'mic', inputId: '' });
        expect(decodeAudioChoice(undefined)).toEqual({ source: 'mic', inputId: '' });
    });

    it("nomme l'entrée choisie", () => {
        const inputs = [{ id: 'mix1', label: 'Stereo Mix (Realtek)' }];
        expect(describeAudioInput(inputs, '')).toBe('Entrée par défaut de Windows');
        expect(describeAudioInput(inputs, 'mix1')).toBe('Stereo Mix (Realtek)');
        expect(describeAudioInput(inputs, 'disparue')).toBe('Entrée choisie (introuvable)');
        expect(describeAudioInput(null, 'x')).toBe('Entrée choisie (introuvable)');
    });
});
