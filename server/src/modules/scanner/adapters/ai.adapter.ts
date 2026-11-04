import axios from 'axios';
import { IAiNormalizer, ExtractedBookMetadata, extractedBookMetadataSchema } from '../types';
import { IsbnUtils } from '../utils/isbn.utils';

export class RegexFallbackNormalizer implements IAiNormalizer {
  async normalizeMetadata(ocrText: string): Promise<{
    metadata: ExtractedBookMetadata;
    confidence: number | null;
    rawResponse?: string;
  }> {
    const rawLines = ocrText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !/^---+.*---+$/.test(l));

    // Extract ISBN (13-digit or 10-digit)
    const isbns = IsbnUtils.extractIsbnsFromText(ocrText);
    const isbn13 = isbns.find((i) => i.length === 13) || null;
    const isbn10 = isbns.find((i) => i.length === 10) || null;

    // Direct standalone 13-digit sequence fallback (978... or 979...)
    let fallbackIsbn13 = isbn13;
    if (!fallbackIsbn13) {
      const directMatch = ocrText.match(/97[89][0-9\-\s]{10,14}[0-9X]/i);
      if (directMatch) {
        const cleaned = directMatch[0].replace(/[^0-9X]/gi, '');
        if (cleaned.length === 13) fallbackIsbn13 = cleaned;
      }
    }

    // Extract Year (e.g., 2005, 2024, Copyright 2022, ឆ្នាំបោះពុម្ព ២០០៥)
    const yearMatch = ocrText.match(/(?:copyright|©|\(c\)|published|year|ឆ្នាំ|បោះពុម្ព)?\s*(19\d{2}|20\d{2})/i);
    const publicationYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

    // Helper: identify comma-separated multi-name author lines (e.g. "Thomas H. Cormen, Charles E. Leiserson...")
    const isMultiNameAuthorLine = (l: string) => {
      const parts = l.split(/[,;&]|\band\b|\bនិង\b/).map((p) => p.trim());
      if (parts.length >= 2) {
        const namePattern = /^[A-Z][a-z]+(\s+[A-Z]\.?)?\s+[A-Z][a-z]+$|^[\u1780-\u17FF\s]{3,}$/;
        const matchCount = parts.filter((p) => namePattern.test(p)).length;
        return matchCount >= 2;
      }
      return false;
    };

    // Clean edition suffixes (e.g. "Fourth Edition", "4th edition") and edge punctuation
    const cleanTitleLine = (l: string) =>
      l
        .replace(/(?:,|\s*[-–]\s*)?(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+(?:st|nd|rd|th)?)\s+edition/gi, '')
        .replace(/^[:\-\s\.,~|^_]+|[:\-\s\.,~|^_]+$/g, '')
        .trim();

    // 1. Authors extraction heuristic (Khmer titles + English prefixes + comma-separated lines)
    let authors: string[] = [];
    const authorPattern = /(?:by\s+|author(?:s)?\s*[:\.]?|written by\s*[:\.]?|និពន្ធ(?:ដោយ)?\s*[:\.]?|រៀបរៀង(?:ដោយ)?\s*[:\.]?|ចងក្រង(?:ដោយ)?\s*[:\.]?|អន[េប][បដ]?[ណគត័]\s*[:\.]?|អនុបណ្ឌិត|បណ្ឌិត|សាស្ត្រាចារ្យ|msc\.|phd|dr\.)\s*([^\n\r,;]+)/gi;
    let authorMatch;
    while ((authorMatch = authorPattern.exec(ocrText)) !== null) {
      let rawName = authorMatch[1]
        .replace(/^(?:អនុបណ្ឌិត|បណ្ឌិត|សាស្ត្រាចារ្យ|អន[េប][បដ]?[ណគត័]\s*[:\.]?|MSc\.|Dr\.|Prof\.)\s*/i, '')
        .replace(/^[:\-\s\.,~|^_]+|[:\-\s\.,~|^_]+$/g, '')
        .trim();
      if (rawName.length >= 2 && rawName.length <= 40 && !authors.includes(rawName)) {
        authors.push(rawName);
      }
    }

    // Check author lines for multi-names (e.g. ជី គឹមអ៊ី, តៃ សំអាង / Thomas H. Cormen, Charles E. Leiserson...)
    const multiAuthorLine = rawLines.find(isMultiNameAuthorLine);
    if (multiAuthorLine && authors.length === 0) {
      authors = multiAuthorLine
        .split(/[,;&]|\band\b|\bនិង\b/)
        .map((a) => a.replace(/^[:\-\s\.,~|^_]+|[:\-\s\.,~|^_]+$/g, '').trim())
        .filter((a) => a.length >= 2);
    }

    const authorLine = rawLines.find((l) => /by\s+|author|authors|និពន្ធ|រៀបរៀង|ចងក្រង|អន[េប][បដ]?[ណគត័]|អនុបណ្ឌិត|msc/i.test(l));
    if (authorLine && authors.length === 0) {
      const cleaned = authorLine
        .replace(/^(?:by\s+|author(?:s)?\s*[:\.]?|និពន្ធ(?:ដោយ)?\s*[:\.]?|រៀបរៀង(?:ដោយ)?\s*[:\.]?|អន[េប][បដ]?[ណគត័]\s*[:\.]?|អនុបណ្ឌិត|MSc\.)\s*/gi, '')
        .split(/,|and|និង|&|;/)
        .map((a) => a.replace(/^[:\-\s\.,~|^_]+|[:\-\s\.,~|^_]+$/g, '').trim())
        .filter((a) => a.length >= 2);
      if (cleaned.length > 0) authors = cleaned;
    }

    // 2. Publisher heuristic (Editions Angkor, គ្រឹះស្ថានបោះពុម្ព..., Publishing, Press)
    let publisher: string | null = null;
    const publisherKhmer = ocrText.match(/គ្រឹះស្ថានបោះពុម្ព[^\n\r,.]+/i);
    const publisherEng = ocrText.match(/(?:Editions\s+[A-Za-z]+|[A-Z][a-zA-Z\s]+(?:Press|Publishing|Publishers|Books|House))/i);
    if (publisherKhmer) {
      publisher = publisherKhmer[0].trim();
    } else if (publisherEng) {
      publisher = publisherEng[0].trim();
    }

    // Helper to check if a candidate line is an author name or publisher
    const isAuthorOrPublisherLine = (l: string) => {
      const norm = l.toLowerCase().replace(/[^a-zA-Z\u1780-\u17FF]/g, '');
      if (publisher) {
        const pubNorm = publisher.toLowerCase().replace(/[^a-zA-Z\u1780-\u17FF]/g, '');
        if (norm.includes(pubNorm) || pubNorm.includes(norm)) return true;
      }
      for (const a of authors) {
        const an = a.toLowerCase().replace(/[^a-zA-Z\u1780-\u17FF]/g, '');
        if (an.length >= 3 && (norm.includes(an) || an.includes(norm))) return true;
      }
      return false;
    };

    // Filter out metadata, noise lines, publisher addresses, and author lines to extract clean title candidates
    const nonTitleRegex = /isbn|issn|copyright|©|\(c\)|press|published|បោះពុម្ព|page|volume|all rights|duc|table of contents|http|www|\.com|អន[េប][បដ]?[ណគត័]|បណ្ឌិត|អនុបណ្ឌិត|សាស្ត្រាចារ្យ|msc|phd|prof|dr|author|written by|by\s+|editions\s+|ផ្ទះលេខ|ផ្លូវ|សង្កាត់|ខណ្ឌ|រាជធានី|ភ្នំពេញ|ខេត្ត|ទូរស័ព្ទ|អ៊ីមែល|tel|phone|fax|email|address|street|building|floor/i;

    const titleCandidates = rawLines
      .map(cleanTitleLine)
      .filter((l) => {
        if (!l || l.length < 3 || l.length > 120) return false;
        if (nonTitleRegex.test(l)) return false;
        if (isMultiNameAuthorLine(l)) return false;
        if (isAuthorOrPublisherLine(l)) return false;
        const clean = l.replace(/[^a-zA-Z\u1780-\u17FF0-9\s]/g, '').trim();
        return clean.length >= 3;
      });

    // Differentiate Khmer and English titles
    const khmerLine = titleCandidates.find((l) => /[\u1780-\u17FF]{4,}/.test(l));
    const englishCandidates = titleCandidates.filter((l) => /[a-zA-Z]{3,}/.test(l));
    let englishLine: string | null = null;
    if (englishCandidates.length > 0) {
      if (englishCandidates.length >= 2 && englishCandidates[0].length < 25 && englishCandidates[1].length < 30) {
        englishLine = `${englishCandidates[0]} ${englishCandidates[1]}`.trim();
      } else {
        englishLine = englishCandidates[0];
      }
    }

    const title = khmerLine || englishLine || titleCandidates[0] || '';
    const subtitle = titleCandidates[1] && titleCandidates[1] !== title && titleCandidates[1].length < 80 ? titleCandidates[1] : null;

    const metadata: ExtractedBookMetadata = {
      title,
      titleKhmer: khmerLine || (/[\\u1780-\\u17FF]/.test(title) ? title : null),
      titleEnglish: englishLine || (/[a-zA-Z]/.test(title) ? title : null),
      subtitle,
      authors: authors.length > 0 ? authors : [],
      isbn10,
      isbn13: fallbackIsbn13,
      publisher,
      publicationYear,
      edition: null,
      language: /[\u1780-\u17FF]/.test(ocrText) ? 'km' : 'en',
      categorySuggestion: null,
      series: null,
      description: null,
    };

    return {
      metadata,
      confidence: 70.0,
      rawResponse: 'Fast Heuristic OCR extraction (No external AI API called)',
    };
  }
}

export class GeminiAiNormalizer implements IAiNormalizer {
  constructor(private apiKey: string) {}

  async normalizeMetadata(
    ocrText: string,
    imageBuffers?: { buffer: Buffer; mimeType: string }[]
  ): Promise<{
    metadata: ExtractedBookMetadata;
    confidence: number | null;
    rawResponse?: string;
  }> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      const fallback = new RegexFallbackNormalizer();
      return fallback.normalizeMetadata(ocrText);
    }

    const systemInstruction = `You are an expert library cataloging AI for Digital University of Cambodia (DUC).
Extract complete, strictly verbatim bibliographic book metadata from the provided book cover and publication pages.

CRITICAL RULES FOR KHMER BOOK COVERS (DO NOT HALLUCINATE OR GUESS):
1. titleKhmer: The EXACT title in Khmer as printed on the book cover.
   - You MUST transcribe the EXACT Khmer letters/words printed prominently in large font.
   - NEVER paraphrase, guess, or replace words with synonyms!
   - Example: If the cover says "100 វិធី បំផុសស្មារតីមនុស្ស", transcribe "100 វិធី បំផុសស្មារតីមនុស្ស" (DO NOT substitute "មនុស្ស" with "បុគ្គលិក" or anything else).
   - Pay close attention to stylized/display fonts: read character by character (e.g., ម-ន-ុ-ស-្ស = មនុស្ស).
2. titleEnglish: If the original English title is known (e.g. "100 Ways to Motivate People") or printed in English, output the clean English title.
3. subtitle: Explanatory taglines or smaller text below the title (e.g. "វិទ្យាសាស្ត្រនៃការគ្រប់គ្រងលើការងារ...").
4. authors: Transcribe author(s), contributor(s), and translator(s) cleanly. Look at "និពន្ធ" (author), "ប្រែសម្រួល" (translator), "ជំនួយការ" or prominent author names printed on the cover (e.g. "ទាវ ឈុនណាន", "Teav Chhun Nan", "ស្ទីវ ឆានដ៍ល័រ"). If names are written in both Khmer and English on the cover, transcribe both names into the authors array. Remove academic prefixes like Dr, MSc, អនុបណ្ឌិត, បណ្ឌិត.
5. isbn13 & isbn10: Look at the back cover barcode or publication page. 13-digit or 10-digit number.
6. publisher: Publisher name from logo or text (e.g. "Editions Angkor", "គ្រឹះស្ថានបោះពុម្ពអង្គរ", "Mind Books").
7. publicationYear: Integer publication year or null.
8. language: "km" if primarily Khmer, else "en".

Respond ONLY with a valid JSON object matching this schema:
{
  "title": string,
  "titleKhmer": string or null,
  "titleEnglish": string or null,
  "subtitle": string or null,
  "authors": string[],
  "isbn10": string or null,
  "isbn13": string or null,
  "publisher": string or null,
  "publicationYear": number or null,
  "edition": string or null,
  "language": "km" or "en",
  "categorySuggestion": string or null,
  "description": string or null
}`;

    const parts: any[] = [{ text: `${systemInstruction}\n\nPlease extract complete book catalog metadata:` }];

    if (imageBuffers && imageBuffers.length > 0) {
      for (const img of imageBuffers) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.buffer.toString('base64'),
          },
        });
      }
    } else {
      parts.push({ text: `Book Scanned Text:\n${ocrText.slice(0, 4000)}` });
    }

    // Prioritize fastest, modern models with verified vision accuracy
    const modelsToTry = [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
    ];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
          {
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.0,
            },
          },
          { timeout: 25000 }
        );

        const rawContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawContent) {
          throw new Error(`Empty response from model ${model}`);
        }

        let cleanJson = rawContent.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

        const parsedJson = JSON.parse(cleanJson);

        if (typeof parsedJson.publicationYear === 'string') {
          const num = parseInt(parsedJson.publicationYear.replace(/\D/g, ''), 10);
          parsedJson.publicationYear = isNaN(num) ? null : num;
        }
        if (typeof parsedJson.isbn13 === 'number') {
          parsedJson.isbn13 = String(parsedJson.isbn13);
        }
        if (typeof parsedJson.isbn10 === 'number') {
          parsedJson.isbn10 = String(parsedJson.isbn10);
        }
        if (!Array.isArray(parsedJson.authors)) {
          parsedJson.authors = parsedJson.authors ? [String(parsedJson.authors)] : [];
        } else {
          parsedJson.authors = parsedJson.authors.map((a: any) => String(a).trim()).filter(Boolean);
        }
        if (!parsedJson.title || typeof parsedJson.title !== 'string' || parsedJson.title.trim() === '') {
          parsedJson.title = parsedJson.titleKhmer || parsedJson.titleEnglish || '';
        }

        const validated = extractedBookMetadataSchema.parse(parsedJson);

        return {
          metadata: validated,
          confidence: 98.0,
          rawResponse: rawContent,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini model ${model} failed, trying next:`, err?.response?.data?.error?.message || err?.message || err);
      }
    }

    console.warn('All Gemini AI models failed or timed out:', lastError?.message || lastError);
    if (imageBuffers && imageBuffers.length > 0 && (!ocrText || ocrText.trim() === '')) {
      throw new Error(`GEMINI_VISION_FAILED: ${lastError?.message || 'Could not extract metadata from images'}`);
    }
    const fallback = new RegexFallbackNormalizer();
    return fallback.normalizeMetadata(ocrText);
  }
}

