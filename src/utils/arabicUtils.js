import ArabicReshaper from 'arabic-reshaper';

export const reshapeArabic = (text) => {
    if (!text) return "";
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    if (!hasArabic) return text;

    try {
        return ArabicReshaper.convertArabic(text);
    } catch (e) {
        console.error("Arabic Reshaping Error:", e);
        return text;
    }
};

export const prepareRTLText = (text) => {
    if (!text) return "";
    const reshaped = ArabicReshaper.convertArabic(text);
    return reshaped;
};
