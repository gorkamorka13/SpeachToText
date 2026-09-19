// ---------------------------------------------------------------------------
// Sources audio (Micro / Audio système / Les deux)
// ---------------------------------------------------------------------------

export const AUDIO_SOURCE_OPTIONS = [
    { value: 'mic', label: '🎙️ Microphone' },
    { value: 'system', label: '🖥️ Audio système / onglet' },
    { value: 'both', label: '🔀 Micro + Système' }
];
export const DEFAULT_AUDIO_SOURCE = 'mic';

/**
 * La liste unique « source audio » de la barre d'outils combine la source
 * (mic / system / both) et l'entrée choisie. Sa valeur :
 *   'mic:<idEntrée>' (idEntrée vide = entrée par défaut de Windows),
 *   'system', ou 'both' (entrée choisie + partage d'onglet).
 */
export const encodeAudioChoice = (audioSource, audioInputId = '') => {
    if (audioSource === 'system') return 'system';
    if (audioSource === 'both') return 'both';
    return `mic:${audioInputId || ''}`;
};

/** Inverse de encodeAudioChoice ; `inputId` n'est renseigné que pour une entrée. */
export const decodeAudioChoice = (value) => {
    if (value === 'system') return { source: 'system' };
    if (value === 'both') return { source: 'both' };
    if (typeof value === 'string' && value.startsWith('mic:')) {
        return { source: 'mic', inputId: value.slice(4) };
    }
    return { source: 'mic', inputId: '' };
};

/** Nom lisible de l'entrée choisie (l'entrée par défaut de Windows si aucun choix). */
export const describeAudioInput = (inputs, inputId) => {
    if (!inputId) return 'Entrée par défaut de Windows';
    return (inputs || []).find(input => input.id === inputId)?.label || 'Entrée choisie (introuvable)';
};

/** La source choisie doit-elle capter le microphone ? */
export const needsMic = (audioSource) => audioSource === 'mic' || audioSource === 'both';

/** La source choisie doit-elle capter l'audio système (partage d'onglet) ? */
export const needsSystemAudio = (audioSource) => audioSource === 'system' || audioSource === 'both';

/** Lit la source mémorisée (repli sur le micro si valeur inconnue). */
export const parseAudioSource = (raw) =>
    AUDIO_SOURCE_OPTIONS.some(option => option.value === raw) ? raw : DEFAULT_AUDIO_SOURCE;

/** Libellé lisible d'une source audio. */
export const describeAudioSource = (audioSource) =>
    AUDIO_SOURCE_OPTIONS.find(option => option.value === audioSource)?.label
    || AUDIO_SOURCE_OPTIONS[0].label;

// ---------------------------------------------------------------------------
// Format du fichier audio (enregistrement ou fichier importé)
// ---------------------------------------------------------------------------

const AUDIO_EXTENSIONS = {
    'audio/webm': 'webm',
    'video/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac'
};

/** Type MIME sans paramètres : « audio/webm;codecs=opus » → « audio/webm ». */
export const normalizeAudioMimeType = (mimeType, fallback = 'audio/webm') => {
    const base = String(mimeType || '').split(';')[0].trim().toLowerCase();
    return base || fallback;
};

/**
 * Extension à donner au fichier audio téléchargé : celle du fichier importé
 * s'il en a une, sinon déduite du type MIME (repli sur « webm », le format
 * produit par MediaRecorder sous Chrome/Firefox).
 */
export const getAudioExtension = (blob) => {
    const fromName = /\.([a-z0-9]{2,5})$/i.exec(blob?.name || '');
    if (fromName) return fromName[1].toLowerCase();
    return AUDIO_EXTENSIONS[normalizeAudioMimeType(blob?.type, '')] || 'webm';
};

/**
 * Contraintes passées à getUserMedia() pour le microphone.
 * `autoGainControl: false` : sous Chrome/Windows, le contrôle automatique du
 * gain d'un flux micro ouvert peut réécrire le volume d'entrée de Windows en
 * continu (le curseur du système « ne tient pas », le niveau remonte dans les
 * pauses). Sans lui, c'est le réglage de Windows qui fait foi. L'annulation
 * d'écho et la suppression de bruit gardent leur valeur par défaut.
 * À utiliser pour TOUS les flux micro : un seul flux avec AGC suffit à
 * modifier le volume système.
 */
export const getMicConstraints = (deviceId = '', { raw = false } = {}) => ({
    audio: {
        autoGainControl: false,
        // Entrée choisie dans les Paramètres ; sans elle, micro par défaut de Windows
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        // Entrée « boucle système » (Stereo Mix…) : ce n'est pas une voix. L'annulation
        // d'écho et la suppression de bruit, pensées pour un micro, dégraderaient
        // (voire couperaient) la musique et le son des vidéos.
        ...(raw ? { echoCancellation: false, noiseSuppression: false } : {})
    }
});

/** Entrée audio par défaut : le micro par défaut de Windows (identifiant vide). */
export const DEFAULT_AUDIO_INPUT = '';

/**
 * Vrai si le libellé d'une entrée ressemble à une capture du son système
 * (Stereo Mix / Mixage stéréo, « What U Hear », câble virtuel…).
 */
export const isLoopbackInputLabel = (label) =>
    /stereo\s*mix|mixage|what\s*u\s*hear|loopback|cable\s*output|voicemeeter/i.test(String(label || ''));

/**
 * Entrées audio proposées à partir de enumerateDevices() : on retire les entrées
 * virtuelles « default » et « communications » de Chrome (l'option « par défaut »
 * est déjà proposée à part) et on donne un nom aux entrées sans libellé (le
 * navigateur n'en fournit qu'une fois le micro autorisé).
 */
export const listAudioInputs = (devices) =>
    (devices || [])
        .filter(d => d.kind === 'audioinput' && d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
        .map((d, index) => ({ id: d.deviceId, label: d.label || `Entrée audio ${index + 1}` }));

/**
 * Contraintes passées à getDisplayMedia().
 * - `video` est obligatoire : Chrome n'accepte la capture d'onglet qu'avec une
 *   piste vidéo (elle n'est jamais enregistrée, seul l'audio l'est).
 * - `systemAudio: 'include'` demande à Chrome d'inclure l'audio aussi pour un
 *   partage d'écran entier ; les autres membres sont ignorés par les
 *   navigateurs qui ne les connaissent pas (Firefox, Safari).
 */
export const getDisplayAudioConstraints = () => ({
    video: true,
    audio: true,
    systemAudio: 'include',
    selfBrowserSurface: 'exclude',
    surfaceSwitching: 'include'
});

// ---------------------------------------------------------------------------
// Limites d'enregistrement (réglables dans les Paramètres)
// ---------------------------------------------------------------------------

/** Durées proposées (en secondes) avant l'arrêt automatique sur silence. */
export const SILENCE_TIMEOUT_OPTIONS = [30, 40, 50];
export const DEFAULT_SILENCE_TIMEOUT = 40;

/**
 * Seuil de silence de l'arrêt automatique, sur la même échelle que le
 * VU-mètre (getRmsLevel, 0..128) : sous ce niveau, on considère qu'il n'y a
 * « pas de son ». Un micro très sensible ou bruyant reste au-dessus d'un seuil
 * bas (l'arrêt ne se déclenche jamais) ; un seuil trop haut, à l'inverse,
 * prend une voix douce pour du silence.
 * Valeurs en dBFS : -55 dB → 12, -50 dB → 24, -42 dB → 43, -35 dB → 59.
 */
export const SILENCE_THRESHOLD_OPTIONS = [
    { value: 12, label: 'Élevée : le moindre son compte' },
    { value: 24, label: 'Normale (défaut)' },
    { value: 43, label: 'Faible : ignore le bruit de fond' },
    { value: 59, label: 'Très faible : voix forte uniquement' }
];
export const DEFAULT_SILENCE_THRESHOLD = 24;

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

/** Lit le seuil de silence mémorisé (repli sur le défaut si valeur inconnue). */
export const parseSilenceThreshold = (raw) => {
    const value = parseInt(raw, 10);
    return SILENCE_THRESHOLD_OPTIONS.some(option => option.value === value)
        ? value
        : DEFAULT_SILENCE_THRESHOLD;
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

/** Échelle du VU-mètre : niveau maximal renvoyé par getRmsLevel(). */
export const LEVEL_SCALE = 128;
/** Niveaux RMS (dBFS) ramenés à 0 et à LEVEL_SCALE sur le VU-mètre. */
export const LEVEL_MIN_DB = -60;
export const LEVEL_MAX_DB = -6;

/**
 * Niveau sonore d'un bloc d'échantillons temporels (AnalyserNode.
 * getFloatTimeDomainData, valeurs de -1 à 1) : RMS converti en dB puis ramené
 * à 0..LEVEL_SCALE (LEVEL_MIN_DB → 0, LEVEL_MAX_DB → LEVEL_SCALE).
 *
 * C'est la mesure d'un vrai VU-mètre. L'ancienne moyenne du spectre de
 * fréquences écrasait le niveau : la voix n'occupe que les basses fréquences,
 * les ~100 autres cases restent proches de zéro, donc même une voix normale
 * donnait une valeur très faible.
 * Renvoie 0 pour un tableau vide/absent ou un silence parfait.
 */
export const getRmsLevel = (samples) => {
    if (!samples || !samples.length) return 0;
    let sumOfSquares = 0;
    for (let i = 0; i < samples.length; i++) {
        sumOfSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumOfSquares / samples.length);
    if (rms <= 0) return 0;
    const db = 20 * Math.log10(rms);
    const ratio = (db - LEVEL_MIN_DB) / (LEVEL_MAX_DB - LEVEL_MIN_DB);
    return Math.max(0, Math.min(1, ratio)) * LEVEL_SCALE;
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

        // `end` est l'index du dernier échantillon non silencieux : borne
        // exclusive = end + 1 pour ne pas l'amputer.
        const endExclusive = end + 1;
        const newBuffer = context.createBuffer(
            audioBuffer.numberOfChannels,
            endExclusive - start,
            sampleRate
        );

        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            newBuffer.copyToChannel(audioBuffer.getChannelData(i).subarray(start, endExclusive), i);
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
