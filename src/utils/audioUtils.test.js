import { describe, it, expect } from 'vitest';
import {
    getAverageLevel,
    parseSilenceTimeout,
    parseMaxRecordingMinutes,
    maxRecordingSeconds,
    isRecordingLimitReached,
    formatRecordingLimit,
    SILENCE_TIMEOUT_OPTIONS,
    DEFAULT_SILENCE_TIMEOUT,
    DEFAULT_MAX_RECORDING_MINUTES
} from './audioUtils';

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

describe('getAverageLevel', () => {
    it('returns 0 for a missing array', () => {
        expect(getAverageLevel(null)).toBe(0);
        expect(getAverageLevel(undefined)).toBe(0);
    });

    it('returns 0 for an empty array', () => {
        expect(getAverageLevel(new Uint8Array(0))).toBe(0);
    });

    it('returns 0 for a silent signal (all zeros)', () => {
        expect(getAverageLevel(new Uint8Array(128))).toBe(0);
    });

    it('returns the flat average of the samples', () => {
        expect(getAverageLevel(new Uint8Array([0, 10, 20, 30]))).toBe(15);
        expect(getAverageLevel(new Uint8Array([64, 64, 64, 64]))).toBe(64);
    });

    it('stays within the AnalyserNode byte range', () => {
        const loud = new Uint8Array(256).fill(255);
        expect(getAverageLevel(loud)).toBe(255);
    });

    it('accepts a plain array as well as a typed array', () => {
        expect(getAverageLevel([2, 4])).toBe(3);
    });
});
