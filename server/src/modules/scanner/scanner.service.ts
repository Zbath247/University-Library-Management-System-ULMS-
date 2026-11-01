import * as fs from 'fs';
import * as path from 'path';
import prisma from '../../db/prisma';
import { ScanStatus, ScanImageType, CandidateSource, CopyStatus, CopyCondition } from '../../types/enums';
import { ScannerImageService } from './services/image.service';
import { TesseractOcrAdapter, MockOcrAdapter } from './adapters/ocr.adapter';
import { GeminiAiNormalizer, RegexFallbackNormalizer } from './adapters/ai.adapter';
import { GoogleBooksProvider, OpenLibraryProvider } from './adapters/isbn.adapter';
import { DuplicateService } from './services/duplicate.service';
import { IsbnUtils } from './utils/isbn.utils';
import { config } from '../../config';

export class ScannerService {
  static async createSession(userId: string) {
    return prisma.bookScanSession.create({
      data: {
        userId,
        status: ScanStatus.DRAFT,
      },
      include: {
        images: true,
      },
    });
  }

  static async addImage(params: {
    sessionId: string;
    imageType: ScanImageType;
    buffer: Buffer;
    originalFileName: string;
    mimeType: string;
  }) {
    const { sessionId, imageType, buffer, originalFileName, mimeType } = params;

    const session = await prisma.bookScanSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('SESSION_NOT_FOUND: Scan session does not exist');

    const processed = await ScannerImageService.processAndStoreImage(buffer, originalFileName, mimeType);

    const image = await prisma.bookScanImage.create({
      data: {
        scanSessionId: sessionId,
        imageType,
        filePath: processed.filePath,
        originalFileName,
        mimeType: processed.mimeType,
        fileSizeBytes: processed.fileSizeBytes,
        imageWidth: processed.width,
        imageHeight: processed.height,
        rotationDegrees: 0,
      },
    });

    await prisma.bookScanSession.update({
      where: { id: sessionId },
      data: { status: ScanStatus.UPLOADED },
    });

    return image;
  }

  static async rotateImage(sessionId: string, imageId: string, degrees: number) {
    const image = await prisma.bookScanImage.findFirst({
      where: { id: imageId, scanSessionId: sessionId },
    });
    if (!image) throw new Error('IMAGE_NOT_FOUND: Image not found in session');

    const newDegrees = (image.rotationDegrees + degrees) % 360;
    const rotated = await ScannerImageService.rotateImage(image.filePath, degrees);

    return prisma.bookScanImage.update({
      where: { id: imageId },
      data: {
        rotationDegrees: newDegrees,
        imageWidth: rotated.width,
        imageHeight: rotated.height,
      },
    });
  }

  static async getImageStream(sessionId: string, imageId: string) {
    const image = await prisma.bookScanImage.findFirst({
      where: { id: imageId, scanSessionId: sessionId },
    });
    if (!image || !fs.existsSync(image.filePath)) {
      throw new Error('IMAGE_NOT_FOUND: Image file does not exist');
    }

    return {
      stream: fs.createReadStream(image.filePath),
      mimeType: image.mimeType,
      fileSizeBytes: image.fileSizeBytes,
    };
  }

  static async processOcrAndAi(sessionId: string, options?: { skipAi?: boolean; manualOnly?: boolean }) {
    const session = await prisma.bookScanSession.findUnique({
      where: { id: sessionId },
      include: { images: true },
    });

    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (session.images.length === 0) throw new Error('NO_IMAGES_UPLOADED: Please capture at least one image');

    // If pure manual entry requested (skip all OCR), transition directly to NEEDS_REVIEW
    if (options?.manualOnly) {
      return prisma.bookScanSession.update({
        where: { id: sessionId },
        data: { status: ScanStatus.NEEDS_REVIEW },
        include: { images: true, candidates: true },
      });
    }

    await prisma.bookScanSession.update({
      where: { id: sessionId },
      data: { status: ScanStatus.PROCESSING },
    });

    try {
      // Collect image buffers
      const imageBuffers: { buffer: Buffer; mimeType: string }[] = [];
      for (const img of session.images) {
        if (fs.existsSync(img.filePath)) {
          imageBuffers.push({
            buffer: fs.readFileSync(img.filePath),
            mimeType: img.mimeType || 'image/jpeg',
          });
        }
      }

      let aiResult: { metadata: any; confidence: number | null; rawResponse?: string } | null = null;
      let combinedOcrText = '';
      let totalConfidence: number | null = null;

      // 1. If AI is enabled and API key is present, prioritize Gemini Multimodal Vision AI first (Ultra-fast ~2.2s)
      if (!options?.skipAi && config.GEMINI_API_KEY) {
        try {
          const geminiNormalizer = new GeminiAiNormalizer(config.GEMINI_API_KEY);
          aiResult = await geminiNormalizer.normalizeMetadata('', imageBuffers);
          if (aiResult && aiResult.metadata && (aiResult.metadata.titleKhmer || aiResult.metadata.titleEnglish || aiResult.metadata.title)) {
            combinedOcrText = `--- GEMINI VISION AI EXTRACTION ---\n` +
              `ចំណងជើងខ្មែរ (Khmer Title): ${aiResult.metadata.titleKhmer || '-'}\n` +
              `ចំណងជើងអង់គ្លេស (English Title): ${aiResult.metadata.titleEnglish || '-'}\n` +
              `អ្នកនិពន្ធ (Authors): ${(aiResult.metadata.authors || []).join(', ')}\n` +
              `រោងពុម្ព (Publisher): ${aiResult.metadata.publisher || '-'}\n` +
              `ISBN-13: ${aiResult.metadata.isbn13 || '-'}\n` +
              `ISBN-10: ${aiResult.metadata.isbn10 || '-'}\n` +
              `ឆ្នាំបោះពុម្ព (Year): ${aiResult.metadata.publicationYear || '-'}\n`;
            totalConfidence = aiResult.confidence;
          }
        } catch (aiErr) {
          console.warn('Direct Gemini Vision failed, will fallback to Local OCR:', aiErr);
          aiResult = null;
        }
      }

      // 2. If AI was skipped, unavailable, or failed, run Local Tesseract OCR + Regex Fallback
      if (!aiResult) {
        const ocrAdapter = process.env.NODE_ENV === 'test' ? new MockOcrAdapter() : new TesseractOcrAdapter();
        let avgConfidence = 0;
        let count = 0;

        for (const img of session.images) {
          if (fs.existsSync(img.filePath)) {
            const buffer = fs.readFileSync(img.filePath);
            try {
              const ocrPromise = ocrAdapter.extractText(buffer, img.mimeType, ['eng', 'khm']);
              const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('OCR_TIMEOUT: Processing exceeded 10s limit')), 10000)
              );
              const ocrResult = await Promise.race([ocrPromise, timeoutPromise]);
              combinedOcrText += `\n--- PAGE: ${img.imageType} ---\n` + ocrResult.rawText;
              if (ocrResult.confidence !== null) {
                avgConfidence += ocrResult.confidence;
                count++;
              }
            } catch (ocrErr) {
              console.warn(`OCR extraction failed/timed out on ${img.originalFileName}:`, ocrErr);
              const fallback = new MockOcrAdapter();
              const fallbackResult = await fallback.extractText(buffer, img.mimeType, ['eng']);
              combinedOcrText += `\n--- PAGE: ${img.imageType} ---\n` + fallbackResult.rawText;
              if (fallbackResult.confidence !== null) {
                avgConfidence += fallbackResult.confidence;
                count++;
              }
            }
          }
        }

        totalConfidence = count > 0 ? Math.round((avgConfidence / count) * 100) / 100 : null;

        const regexNormalizer = new RegexFallbackNormalizer();
        aiResult = await regexNormalizer.normalizeMetadata(combinedOcrText);
      }

      // Save raw OCR / AI dump candidate
      await prisma.metadataCandidate.create({
        data: {
          scanSessionId: sessionId,
          source: CandidateSource.OCR_RAW,
          fieldName: 'raw_ocr_dump',
          fieldValue: combinedOcrText,
          confidence: totalConfidence as any,
        },
      });

      // Save structured candidates
      const fields = [
        { name: 'title', val: aiResult.metadata.title },
        { name: 'titleKhmer', val: aiResult.metadata.titleKhmer || aiResult.metadata.title },
        { name: 'titleEnglish', val: aiResult.metadata.titleEnglish },
        { name: 'subtitle', val: aiResult.metadata.subtitle },
        { name: 'authors', val: JSON.stringify(aiResult.metadata.authors || []) },
        { name: 'isbn10', val: aiResult.metadata.isbn10 },
        { name: 'isbn13', val: aiResult.metadata.isbn13 },
        { name: 'publisher', val: aiResult.metadata.publisher },
        { name: 'publicationYear', val: aiResult.metadata.publicationYear ? String(aiResult.metadata.publicationYear) : null },
        { name: 'edition', val: aiResult.metadata.edition },
        { name: 'language', val: aiResult.metadata.language },
        { name: 'description', val: aiResult.metadata.description },
      ];

      for (const f of fields) {
        if (f.val) {
          await prisma.metadataCandidate.create({
            data: {
              scanSessionId: sessionId,
              source: CandidateSource.AI_NORMALIZED,
              fieldName: f.name,
              fieldValue: f.val,
              confidence: aiResult.confidence as any,
            },
          });
        }
      }

      // 3. External ISBN lookup if an ISBN was extracted
      const detectedIsbn = aiResult.metadata.isbn13 || aiResult.metadata.isbn10;
      if (detectedIsbn) {
        await this.lookupIsbnCandidates(sessionId, detectedIsbn);
      }

      // Update session to NEEDS_REVIEW
      return prisma.bookScanSession.update({
        where: { id: sessionId },
        data: { status: ScanStatus.NEEDS_REVIEW },
        include: { images: true, candidates: true },
      });
    } catch (err: any) {
      await prisma.bookScanSession.update({
        where: { id: sessionId },
        data: { status: ScanStatus.FAILED, failureReason: err.message },
      });
      throw err;
    }
  }

  static async lookupIsbnCandidates(sessionId: string, rawIsbn: string) {
    const google = new GoogleBooksProvider(config.GOOGLE_BOOKS_API_KEY);
    const openLib = new OpenLibraryProvider();

    const [googleResult, openLibResult] = await Promise.all([
      google.lookup(rawIsbn),
      openLib.lookup(rawIsbn),
    ]);

    if (googleResult) {
      await prisma.metadataCandidate.create({
        data: {
          scanSessionId: sessionId,
          source: CandidateSource.ISBN_GOOGLE_BOOKS,
          fieldName: 'google_books_match',
          fieldValue: JSON.stringify(googleResult),
          confidence: 95.0,
        },
      });
    }

    if (openLibResult) {
      await prisma.metadataCandidate.create({
        data: {
          scanSessionId: sessionId,
          source: CandidateSource.ISBN_OPEN_LIBRARY,
          fieldName: 'open_library_match',
          fieldValue: JSON.stringify(openLibResult),
          confidence: 90.0,
        },
      });
    }
  }

  static async lookupDirectIsbn(isbn: string) {
    const clean = IsbnUtils.clean(isbn);
    if (!clean) {
      throw new Error('INVALID_ISBN: Please provide an ISBN number');
    }

    const google = new GoogleBooksProvider(config.GOOGLE_BOOKS_API_KEY);
    const openLib = new OpenLibraryProvider();

    const [googleResult, openLibResult] = await Promise.allSettled([
      google.lookup(clean),
      openLib.lookup(clean),
    ]);

    const googleData = googleResult.status === 'fulfilled' ? googleResult.value : null;
    const openLibData = openLibResult.status === 'fulfilled' ? openLibResult.value : null;
    const match = googleData || openLibData;

    return {
      isbn: clean,
      match,
      candidates: {
        googleBooks: googleData,
        openLibrary: openLibData,
      },
    };
  }

  static async getReviewDesk(sessionId: string) {
    const session = await prisma.bookScanSession.findUnique({
      where: { id: sessionId },
      include: {
        images: { orderBy: { uploadedAt: 'asc' } },
        candidates: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) throw new Error('SESSION_NOT_FOUND');

    // Parse extracted fields
    const getField = (name: string) =>
      session.candidates.find((c) => c.source === CandidateSource.AI_NORMALIZED && c.fieldName === name)?.fieldValue || null;

    const title = getField('title') || '';
    const titleKhmerCandidate = getField('titleKhmer');
    const titleEnglishCandidate = getField('titleEnglish');
    const subtitle = getField('subtitle');
    const authorsRaw = getField('authors');
    const authors = authorsRaw ? JSON.parse(authorsRaw) : [];
    const isbn10 = getField('isbn10');
    const isbn13 = getField('isbn13');
    const publisher = getField('publisher');
    const publicationYear = getField('publicationYear') ? parseInt(getField('publicationYear')!, 10) : null;
    const edition = getField('edition');
    const language = getField('language') || 'km';
    const description = getField('description');

    // External candidates
    const googleCandidate = session.candidates.find((c) => c.source === CandidateSource.ISBN_GOOGLE_BOOKS);
    const openLibCandidate = session.candidates.find((c) => c.source === CandidateSource.ISBN_OPEN_LIBRARY);
    const googleData = googleCandidate ? JSON.parse(googleCandidate.fieldValue) : null;
    const openLibData = openLibCandidate ? JSON.parse(openLibCandidate.fieldValue) : null;
    const extMatch = googleData || openLibData;

    const finalTitle = title || extMatch?.title || '';
    const isKhmer = /[\u1780-\u17FF]/.test(finalTitle);

    // AI confidence check
    const aiCandidate = session.candidates.find((c) => c.source === CandidateSource.AI_NORMALIZED);
    const isAiResult = !!(aiCandidate && Number(aiCandidate.confidence) >= 90);

    // Duplicate detection
    const duplicateCheck = await DuplicateService.findPotentialDuplicates({
      isbn10: isbn10 || extMatch?.isbn10,
      isbn13: isbn13 || extMatch?.isbn13,
      title: finalTitle,
      authors: authors.length > 0 ? authors : (extMatch?.authors || []),
    });

    return {
      session,
      images: session.images,
      extractionMethod: extMatch ? 'ISBN_MATCH' : (isAiResult ? 'GEMINI_AI' : 'LOCAL_OCR'),
      extracted: {
        title: finalTitle,
        titleKhmer: titleKhmerCandidate || (isKhmer ? finalTitle : (extMatch?.title || '')),
        titleEnglish: titleEnglishCandidate || (!isKhmer ? finalTitle : (extMatch?.title || '')),
        subtitle: subtitle || extMatch?.subtitle || null,
        authors: authors.length > 0 ? authors : (extMatch?.authors || []),
        isbn10: isbn10 || extMatch?.isbn10 || null,
        isbn13: isbn13 || extMatch?.isbn13 || null,
        publisher: publisher || extMatch?.publisher || null,
        publicationYear: publicationYear || extMatch?.publicationYear || null,
        edition: edition || extMatch?.edition || null,
        language: language || (isKhmer ? 'km' : 'en'),
        description: description || extMatch?.description || null,
      },
      externalCandidates: {
        googleBooks: googleData,
        openLibrary: openLibData,
      },
      duplicateCheck,
      rawOcrText: session.candidates.find((c) => c.source === CandidateSource.OCR_RAW)?.fieldValue || '',
    };
  }

  static async approveAndSaveCatalog(params: {
    sessionId: string;
    mode: 'NEW_TITLE' | 'ADD_COPY_TO_EXISTING';
    existingBookId?: string;
    bookData: {
      titleKhmer: string;
      titleEnglish: string;
      subtitle?: string | null;
      isbn10?: string | null;
      isbn13?: string | null;
      authors: string[];
      publisher?: string | null;
      publicationYear?: number | null;
      edition?: string | null;
      language?: string;
      categoryId: string;
      descriptionKhmer?: string | null;
      descriptionEnglish?: string | null;
      coverImageUrl?: string | null;
    };
    copyData: {
      accessionNumber: string;
      barcode: string;
      shelfLocation: string;
      callNumber?: string | null;
      condition?: CopyCondition;
      copyCount?: number;
    };
  }) {
    const { sessionId, mode, existingBookId, bookData, copyData } = params;

    const session = await prisma.bookScanSession.findUnique({
      where: { id: sessionId },
      include: { images: true },
    });
    if (!session) throw new Error('SESSION_NOT_FOUND');

    // Idempotency check: if session already saved, return saved entities
    if (session.status === ScanStatus.SAVED && session.savedBookId && session.savedBookCopyId) {
      const book = await prisma.book.findUnique({ where: { id: session.savedBookId } });
      const copy = await prisma.bookCopy.findUnique({ where: { id: session.savedBookCopyId } });
      return { book, copy, alreadySaved: true };
    }

    return prisma.$transaction(async (tx) => {
      let bookId: string;

      if (mode === 'ADD_COPY_TO_EXISTING' && existingBookId) {
        bookId = existingBookId;
      } else {
        // Automatically retain scanned cover image if none was manually set
        let finalCoverUrl = bookData.coverImageUrl || null;
        if (!finalCoverUrl && session.images?.length) {
          const coverImage = session.images.find((img) => img.imageType === ScanImageType.COVER);
          if (coverImage && fs.existsSync(coverImage.filePath)) {
            const uploadsDir = path.resolve(process.cwd(), 'storage/uploads');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            const ext = path.extname(coverImage.filePath) || '.jpg';
            const newFilename = `scan-cover-${coverImage.id}${ext}`;
            const targetPath = path.join(uploadsDir, newFilename);
            fs.copyFileSync(coverImage.filePath, targetPath);
            finalCoverUrl = `/api/v1/uploads/${newFilename}`;
          }
        }

        const createdBook = await tx.book.create({
          data: {
            titleKhmer: bookData.titleKhmer,
            titleEnglish: bookData.titleEnglish,
            subtitle: bookData.subtitle || null,
            isbn10: bookData.isbn10 ? IsbnUtils.clean(bookData.isbn10) : null,
            isbn13: bookData.isbn13 ? IsbnUtils.clean(bookData.isbn13) : null,
            authors: JSON.stringify(bookData.authors),
            publisher: bookData.publisher || null,
            publicationYear: bookData.publicationYear || null,
            edition: bookData.edition || null,
            language: bookData.language || 'km',
            categoryId: bookData.categoryId,
            descriptionKhmer: bookData.descriptionKhmer || null,
            descriptionEnglish: bookData.descriptionEnglish || null,
            coverImageUrl: finalCoverUrl,
          },
        });
        bookId = createdBook.id;
      }

      // Create Physical Copies (Supports Single Copy or Batch Copies 1..100)
      const count = Math.max(1, Math.min(100, copyData.copyCount || 1));
      const createdCopies: any[] = [];
      const cleanBaseAccession = copyData.accessionNumber.replace(/-0*1$/, '');
      const cleanBaseBarcode = copyData.barcode.replace(/-0*1$/, '');

      for (let i = 0; i < count; i++) {
        const copyNum = String(i + 1).padStart(2, '0');
        let accNum = count === 1 ? copyData.accessionNumber : `${cleanBaseAccession}-${copyNum}`;
        let barCode = count === 1 ? copyData.barcode : `${cleanBaseBarcode}-${copyNum}`;

        // Ensure unique accession number
        const existingAcc = await tx.bookCopy.findUnique({ where: { accessionNumber: accNum } });
        if (existingAcc) {
          accNum = `${accNum}-${Math.floor(100 + Math.random() * 900)}`;
        }

        // Ensure unique barcode
        const existingBar = await tx.bookCopy.findUnique({ where: { barcode: barCode } });
        if (existingBar) {
          barCode = `${barCode}-${Math.floor(100 + Math.random() * 900)}`;
        }

        const createdCopy = await tx.bookCopy.create({
          data: {
            bookId,
            accessionNumber: accNum,
            barcode: barCode,
            callNumber: copyData.callNumber || null,
            shelfLocation: copyData.shelfLocation || 'ទូទី ១, ជាន់ A-01',
            condition: copyData.condition || CopyCondition.NEW,
            status: CopyStatus.AVAILABLE,
          },
        });
        createdCopies.push(createdCopy);
      }

      // Update ScanSession to SAVED
      await tx.bookScanSession.update({
        where: { id: sessionId },
        data: {
          status: ScanStatus.SAVED,
          savedBookId: bookId,
          savedBookCopyId: createdCopies[0].id,
          completedAt: new Date(),
        },
      });

      const fullBook = await tx.book.findUnique({
        where: { id: bookId },
        include: { category: true, copies: true },
      });

      return {
        book: fullBook,
        copy: createdCopies[0],
        copies: createdCopies,
        createdCopiesCount: createdCopies.length,
        alreadySaved: false,
      };
    });
  }

  static async cancelSession(sessionId: string) {
    const session = await prisma.bookScanSession.findUnique({
      where: { id: sessionId },
      include: { images: true },
    });

    if (!session) return;

    // Delete image files
    for (const img of session.images) {
      ScannerImageService.deleteImage(img.filePath);
    }

    return prisma.bookScanSession.update({
      where: { id: sessionId },
      data: { status: ScanStatus.CANCELLED },
    });
  }
}

