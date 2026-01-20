export const trimSilence = async (audioBlob) => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

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
