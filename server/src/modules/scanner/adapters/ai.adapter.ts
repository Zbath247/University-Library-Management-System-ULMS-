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

    // Filter out metadata, noise lines, and author prefixes to extract clean title candidates
    const nonTitleRegex = /isbn|issn|copyright|©|\(c\)|press|edition|published|បោះពុម្ព|page|volume|all rights|duc|table of contents|http|www|\.com|អន[េប][បដ]?[ណគត័]|បណ្ឌិត|អនុបណ្ឌិត|សាស្ត្រាចារ្យ|msc|phd|prof|dr|author|written by|by\s+|editions\s+/i;
    
    // Filter lines: must be at least 4 meaningful characters, not just punctuation or 1-2 broken syllables
    const titleCandidates = rawLines.filter((l) => {
      if (nonTitleRegex.test(l)) return false;
      const clean = l.replace(/[^a-zA-Z\u1780-\u17FF0-9\s]/g, '').trim();
      return clean.length >= 4 && clean.length <= 120;
    });

    // Differentiate Khmer and English titles
    const khmerLine = titleCandidates.find((l) => /[\u1780-\u17FF]{4,}/.test(l));
    const englishLine = titleCandidates.find((l) => /[a-zA-Z]{3,}/.test(l));

    const title = khmerLine || englishLine || titleCandidates[0] || '';
    const subtitle = titleCandidates[1] && titleCandidates[1] !== title && titleCandidates[1].length < 80 ? titleCandidates[1] : null;

    // Authors extraction heuristic (Khmer titles + English prefixes)
    let authors: string[] = [];
    const authorPattern = /(?:by\s+|author(?:s)?:?|written by:?|និពន្ធដោយ:?|រៀបរៀងដោយ:?|ចងក្រងដោយ:?|អន[េប][បដ]?[ណគត័][ៈ:]?|អនុបណ្ឌិត|បណ្ឌិត|សាស្ត្រាចារ្យ|msc\.|phd|dr\.)\s*([^\n\r,;]+)/gi;
    let authorMatch;
    while ((authorMatch = authorPattern.exec(ocrText)) !== null) {
      const rawName = authorMatch[1].replace(/^(?:អនុបណ្ឌិត|បណ្ឌិត|សាស្ត្រាចារ្យ|អន[េប][បដ]?[ណគត័][ៈ:]?|MSc\.|Dr\.|Prof\.)\s*/i, '').trim();
      if (rawName.length >= 2 && rawName.length <= 40 && !authors.includes(rawName)) {
        authors.push(rawName);
      }
    }

    // Check author lines for multi-names (e.g. ជី គឹមអ៊ី, តៃ សំអាង / Chi Kim Y, Tai Samnang)
    const authorLine = rawLines.find((l) => /by\s+|author|authors|និពន្ធ|រៀបរៀង|ចងក្រង|អន[េប][បដ]?[ណគត័]|អនុបណ្ឌិត|msc/i.test(l));
    if (authorLine && authors.length === 0) {
      const cleaned = authorLine
        .replace(/^(?:by\s+|author(?:s)?:|និពន្ធដោយ:?|រៀបរៀងដោយ:?|អន[េប][បដ]?[ណគត័][ៈ:]?|អនុបណ្ឌិត|MSc\.)\s*/gi, '')
        .split(/,|and|និង|&|;/)
        .map((a) => a.trim())
        .filter((a) => a.length >= 2);
      if (cleaned.length > 0) authors = cleaned;
    }

    // Publisher heuristic (Editions Angkor, គ្រឹះស្ថានបោះពុម្ព..., Publishing, Press)
    let publisher: string | null = null;
    const publisherKhmer = ocrText.match(/គ្រឹះស្ថានបោះពុម្ព[^\n\r,.]+/i);
    const publisherEng = ocrText.match(/(?:Editions\s+[A-Za-z]+|[A-Z][a-zA-Z\s]+(?:Press|Publishing|Publishers|Books|House))/i);
    if (publisherKhmer) {
      publisher = publisherKhmer[0].trim();
    } else if (publisherEng) {
      publisher = publisherEng[0].trim();
    }

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
Extract complete and accurate bibliographic book metadata from the provided book cover and publication pages.
Instructions:
1. title: The primary title of the book
2. titleKhmer: The Khmer title (e.g. "រចនាគេហទំព័រ ជាមួយ ASP.net 1")
3. titleEnglish: The English title (e.g. "ASP.net with Visual Studio 2005")
4. subtitle: Subtitle if any, or null
5. authors: Array of author names. CRITICAL: Remove all academic honorifics/prefixes like MSc, Dr, អនុបណ្ឌិត, បណ្ឌិត. If authors are written in both Khmer and English, include all clean names (e.g. ["Chi Kim Y", "Te Samnang", "ជី គីមអ៊ី", "តែ សំណាង"]).
6. publisher: Publisher name (e.g. "Editions Angkor" or "គ្រឹះស្ថានបោះពុម្ពអង្គរ")
7. publicationYear: Integer publication year (e.g. 2005) or null
8. isbn13: 13-digit standard ISBN barcode or printed sequence (digits only, e.g. "9789995020255") or null
9. isbn10: 10-digit ISBN if found or null
10. language: "km" if primarily Khmer, else "en"
11. edition: Edition if mentioned or null

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

    // Try fastest, modern models first with automatic fallback
    const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
          {
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          },
          { timeout: 20000 }
        );

        const rawContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawContent) {
          throw new Error(`Empty response from model ${model}`);
        }

        const parsedJson = JSON.parse(rawContent);
        if (!parsedJson.title) {
          parsedJson.title = parsedJson.titleKhmer || parsedJson.titleEnglish || 'Unknown Title';
        }
        if (!Array.isArray(parsedJson.authors)) {
          parsedJson.authors = parsedJson.authors ? [parsedJson.authors] : [];
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

    console.warn('All Gemini AI models failed or timed out, falling back to regex parser:', lastError?.message || lastError);
    const fallback = new RegexFallbackNormalizer();
    return fallback.normalizeMetadata(ocrText);
  }
}

