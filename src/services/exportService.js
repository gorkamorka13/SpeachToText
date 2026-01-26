import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { amiriFont } from '../AmiriFont';
import ArabicReshaper from 'arabic-reshaper';
import { prepareRTLText } from '../utils/arabicUtils';

export const generatePDF = ({ transcript, aiResult, translatedTranscript, enableTranslation, targetLanguage, pdfJustify, customFilename }) => {
    if (!transcript && !aiResult) return null;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const availableWidth = pageWidth - margin * 2;
    let yPosition = 20;

    doc.addFileToVFS('Amiri-Regular.ttf', amiriFont);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    const writeTextLine = (text, x, y, width, align, isJustify, isArabic) => {
        if (isArabic) {
            const line = prepareRTLText(text);
            doc.text(line, x + width, y, { align: 'right' });
            return;
        }

        if (isJustify) {
            const words = text.trim().split(/\s+/);
            if (words.length > 1) {
                const totalWordsWidth = words.reduce((sum, word) => sum + doc.getTextWidth(word), 0);
                const totalSpaceToFill = width - totalWordsWidth;
                const individualSpaceWidth = totalSpaceToFill / (words.length - 1);

                let currentX = x;
                words.forEach((word, i) => {
                    doc.text(word, currentX, y);
                    currentX += doc.getTextWidth(word) + individualSpaceWidth;
                });
                return;
            }
        }

        doc.text(text, x, y, { align });
    };

    const writeParagraphs = (text, x, y, width, align = 'left') => {
        const paragraphs = text.split('\n');
        const innerLineHeight = 5;
        let currentY = y;

        for (let p = 0; p < paragraphs.length; p++) {
            const paragraph = paragraphs[p];
            if (!paragraph.trim()) {
                if (p < paragraphs.length - 1) currentY += innerLineHeight;
                continue;
            }

            const isArabic = /[\u0600-\u06FF]/.test(paragraph);
            doc.setFont(isArabic ? "Amiri" : "helvetica", "normal");

            const reshapedPara = isArabic ? ArabicReshaper.convertArabic(paragraph) : paragraph;
            const lines = doc.splitTextToSize(reshapedPara, width);

            for (let i = 0; i < lines.length; i++) {
                if (currentY > pageHeight - 20) {
                    doc.addPage();
                    currentY = 20;
                    doc.setFont(isArabic ? "Amiri" : "helvetica", "normal");
                }

                const isLastLine = i === lines.length - 1;
                const isJustify = pdfJustify && !isLastLine && !isArabic;

                writeTextLine(lines[i], x, currentY, width, align, isJustify, isArabic);
                currentY += innerLineHeight;
            }
            currentY += 2;
        }
        return currentY;
    };

    if (aiResult) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Encounter", margin, yPosition);
        yPosition += 7;
        if (customFilename) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(100);
            doc.text(`Fichier : ${customFilename}`, margin, yPosition);
            yPosition += 8;
        } else {
            yPosition += 3;
        }
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        yPosition = writeParagraphs(aiResult, margin, yPosition, availableWidth, 'left');
    } else {
        if (enableTranslation && translatedTranscript) {
            const colGap = 10;
            const colWidth = (availableWidth - colGap) / 2;

            doc.setFont("helvetica", "bold");
            doc.text("Original", margin, yPosition);
            doc.text(`Traduction (${targetLanguage})`, margin + colWidth + colGap, yPosition);
            yPosition += 7;
            doc.setFont("helvetica", "normal");

            const originalParagraphs = transcript.split('\n');
            const translatedParagraphs = translatedTranscript.split('\n');
            const maxPara = Math.max(originalParagraphs.length, translatedParagraphs.length);
            const lineHeight = 4;

            for (let i = 0; i < maxPara; i++) {
                const origPara = originalParagraphs[i] || "";
                const transPara = translatedParagraphs[i] || "";

                const isArabicOrig = /[\u0600-\u06FF]/.test(origPara);
                const isArabicTrans = /[\u0600-\u06FF]/.test(transPara);

                const reshapedOrig = isArabicOrig ? ArabicReshaper.convertArabic(origPara) : origPara;
                const reshapedTrans = isArabicTrans ? ArabicReshaper.convertArabic(transPara) : transPara;

                doc.setFont(isArabicOrig ? "Amiri" : "helvetica", "normal");
                const splitOrig = doc.splitTextToSize(reshapedOrig, colWidth);

                doc.setFont(isArabicTrans ? "Amiri" : "helvetica", "normal");
                const splitTrans = doc.splitTextToSize(reshapedTrans, colWidth);

                const paraLines = Math.max(splitOrig.length, splitTrans.length);

                if (yPosition + (paraLines * lineHeight) > pageHeight - 20 && yPosition > 30) {
                    doc.addPage();
                    yPosition = 20;
                    doc.setFont("helvetica", "bold");
                    doc.text("Original", margin, yPosition);
                    doc.text(`Traduction (${targetLanguage})`, margin + colWidth + colGap, yPosition);
                    yPosition += 7;
                }

                for (let j = 0; j < paraLines; j++) {
                    if (yPosition > pageHeight - 20) {
                        doc.addPage();
                        yPosition = 20;
                        doc.setFont("helvetica", "bold");
                        doc.text("Original", margin, yPosition);
                        doc.text(`Traduction (${targetLanguage})`, margin + colWidth + colGap, yPosition);
                        yPosition += 7;
                    }

                    if (j < splitOrig.length) {
                        doc.setFont(isArabicOrig ? "Amiri" : "helvetica", "normal");
                        const isLastLine = j === splitOrig.length - 1;
                        const isJustify = pdfJustify && !isLastLine && !isArabicOrig;
                        writeTextLine(splitOrig[j], margin, yPosition, colWidth, 'left', isJustify, isArabicOrig);
                    }

                    if (j < splitTrans.length) {
                        doc.setFont(isArabicTrans ? "Amiri" : "helvetica", "normal");
                        const isLastLine = j === splitTrans.length - 1;
                        const isJustify = pdfJustify && !isLastLine && !isArabicTrans;
                        writeTextLine(splitTrans[j], margin + colWidth + colGap, yPosition, colWidth, 'left', isJustify, isArabicTrans);
                    }
                    yPosition += lineHeight;
                }
                yPosition += 2;
            }
        } else {
            yPosition = writeParagraphs(transcript, margin, yPosition, availableWidth, 'left');
        }
    }

    const totalPages = doc.internal.getNumberOfPages();
    const currentDate = new Date().toLocaleDateString('fr-FR');
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        const footerText = `Page ${i} / ${totalPages} - ${currentDate}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    return doc;
};

export const downloadDOCX = async ({ transcript, aiResult, translatedTranscript, enableTranslation, targetLanguage, aiModel, pdfJustify, customFilename }) => {
    if (!transcript && !aiResult) return;

    const children = [];

    children.push(new Paragraph({
        text: "Rapport de Transcription Encounter",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
    }));

    children.push(new Paragraph({
        children: [
            new TextRun({ text: `Date : ${new Date().toLocaleDateString('fr-FR')}`, bold: true }),
            new TextRun({ break: 1, text: `Modèle utilisé : ${aiModel}` }),
        ],
        spacing: { after: 400 },
    }));

    if (aiResult) {
        children.push(new Paragraph({ text: "Analyse de l'Agent IA", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
        children.push(new Paragraph({
            children: [new TextRun(aiResult)],
            alignment: pdfJustify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
            spacing: { after: 400 },
        }));
    }

    if (transcript) {
        children.push(new Paragraph({ text: "Transcription Originale", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
        children.push(new Paragraph({
            children: [new TextRun(transcript)],
            alignment: pdfJustify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
            spacing: { after: 400 },
        }));
    }

    if (enableTranslation && translatedTranscript) {
        children.push(new Paragraph({ text: `Traduction (${targetLanguage})`, heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
        children.push(new Paragraph({
            children: [new TextRun(translatedTranscript)],
            alignment: pdfJustify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
            spacing: { after: 400 },
        }));
    }

    children.push(new Paragraph({
        children: [new TextRun({ text: "Généré par SpeachToText - Encounter AI", italic: true, size: 18 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800 },
    }));

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    const fileName = customFilename
        ? `${customFilename}.docx`
        : `encounter-report-${new Date().toISOString().slice(0, 10)}.docx`;
    saveAs(blob, fileName);
};
