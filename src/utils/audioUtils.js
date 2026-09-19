// ---------------------------------------------------------------------------
// Limites d'enregistrement (réglables dans les Paramètres)
// ---------------------------------------------------------------------------

/** Durées proposées (en secondes) avant l'arrêt automatique sur silence. */
export const SILENCE_TIMEOUT_OPTIONS = [30, 40, 50];
export const DEFAULT_SILENCE_TIMEOUT = 40;

/** Durée maximale d'enregistrement proposée (minutes, 0 = illimité). */
export const MAX_RECORDING_OPTIONS = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 heure (défaut)' },
    { value: 90, label: '1 h 30' },
    { value: 120, label: '2 heures' },
    { value: 180, label: '3 heures' },
    { value: 0, label: 'Illimité (non recommandé)' }
];
export const DEFAULT_MAX_RECORDING_MINUTES = 60;

/** Lit le délai de silence mémorisé (repli sur le défaut si valeur inconnue). */
export const parseSilenceTimeout = (raw) => {
    const value = parseInt(raw, 10);
    return SILENCE_TIMEOUT_OPTIONS.includes(value) ? value : DEFAULT_SILENCE_TIMEOUT;
};

/** Lit la durée maximale mémorisée (repli sur le défaut si valeur inconnue). */
export const parseMaxRecordingMinutes = (raw) => {
    if (raw === null || raw === undefined || raw === '') return DEFAULT_MAX_RECORDING_MINUTES;
    const value = parseInt(raw, 10);
    if (!Number.isFinite(value) || value < 0) return DEFAULT_MAX_RECORDING_MINUTES;
    return MAX_RECORDING_OPTIONS.some(option => option.value === value)
        ? value
        : DEFAULT_MAX_RECORDING_MINUTES;
};

/** Durée maximale en secondes (Infinity lorsque aucune limite n'est fixée). */
export const maxRecordingSeconds = (minutes) => (minutes > 0 ? minutes * 60 : Infinity);

/** Vrai si la durée écoulée atteint la limite configurée. */
export const isRecordingLimitReached = (elapsedSeconds, maxMinutes) =>
    Boolean(maxMinutes > 0) && elapsedSeconds >= maxMinutes * 60;

/** Libellé lisible d'une limite en minutes (pour les notifications). */
export const formatRecordingLimit = (minutes) => {
    if (!minutes || minutes <= 0) return 'illimité';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (rest) return `${hours} h ${rest}`;
    return hours === 1 ? '1 heure' : `${hours} heures`;
};

/**
 * Average level of a byte frequency array produced by an AnalyserNode
 * (getByteFrequencyData). Returns 0..~128, 0 for an empty/missing array.
 * Extracted from App.jsx so the VU-meter math is unit-testable without a
 * browser.
 */
export const getAverageLevel = (dataArray) => {
    if (!dataArray || !dataArray.length) return 0;
    let values = 0;
    for (let i = 0; i < dataArray.length; i++) {
        values += dataArray[i];
    }
    return values / dataArray.length;
};

export const trimSilence = async (audioBlob, audioContext = null) => {
    const shouldCloseContext = audioContext === null;
    const context = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    
    try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);

        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const threshold = 0.01;

        let start = 0;
        while (start < channelData.length && Math.abs(channelData[start]) < threshold) {
            start++;
        }

        let end = channelData.length - 1;
        while (end > start && Math.abs(channelData[end]) < threshold) {
            end--;
        }

        if (start >= end) return audioBlob;

        const newBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            end - start,
            sampleRate
        );

        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            newBuffer.copyToChannel(audioBuffer.getChannelData(i).subarray(start, end), i);
        }

        return bufferToWav(newBuffer);
    } catch (e) {
        console.error("Trim Silence error:", e);
        return audioBlob;
    } finally {
        if (shouldCloseContext && context.state !== 'closed') {
            context.close().catch(() => {});
        }
    }
};

export function bufferToWav(abuffer) {
    let numOfChan = abuffer.numberOfChannels,
        length = abuffer.length * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    const setUint16 = (data) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };

    const setUint32 = (data) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"
    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                  // length = 16
    setUint16(1);                                   // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                  // 16-bit (hardcoded)
    setUint32(0x61746164);                         // "data" - chunk
    setUint32(length - pos - 4);                   // chunk length

    for (i = 0; i < abuffer.numberOfChannels; i++)
        channels.push(abuffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++
    }

    return new Blob([buffer], { type: "audio/wav" });
}
