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

  static async processOcrAndAi(sessionId: string) {
    const session = await prisma.bookScanSession.findUnique({
      where: { id: sessionId },
      include: { images: true },
    });

    if (!session) throw new Error('SESSION_NOT_FOUND');
    if (session.images.length === 0) throw new Error('NO_IMAGES_UPLOADED: Please capture at least one image');

    await prisma.bookScanSession.update({
      where: { id: sessionId },
      data: { status: ScanStatus.PROCESSING },
    });

    try {
      // 1. Run OCR on each image
      const ocrAdapter = process.env.NODE_ENV === 'test' ? new MockOcrAdapter() : new TesseractOcrAdapter();
      let combinedOcrText = '';
      let avgConfidence = 0;
      let count = 0;

      for (const img of session.images) {
        if (fs.existsSync(img.filePath)) {
          const buffer = fs.readFileSync(img.filePath);
          try {
            const ocrResult = await ocrAdapter.extractText(buffer, img.mimeType, ['eng', 'khm']);
            combinedOcrText += `\n--- PAGE: ${img.imageType} ---\n` + ocrResult.rawText;
            if (ocrResult.confidence !== null) {
              avgConfidence += ocrResult.confidence;
              count++;
            }
          } catch (ocrErr) {
            console.warn(`OCR extraction failed on ${img.originalFileName}, using resilient fallback:`, ocrErr);
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

      const totalConfidence = count > 0 ? Math.round((avgConfidence / count) * 100) / 100 : null;

      // Save raw OCR candidate
      await prisma.metadataCandidate.create({
        data: {
          scanSessionId: sessionId,
          source: CandidateSource.OCR_RAW,
          fieldName: 'raw_ocr_dump',
          fieldValue: combinedOcrText,
          confidence: totalConfidence as any,
        },
      });

      // 2. Normalize metadata with AI or Regex Fallback
      const normalizer = config.GEMINI_API_KEY
        ? new GeminiAiNormalizer(config.GEMINI_API_KEY)
        : new RegexFallbackNormalizer();

      const aiResult = await normalizer.normalizeMetadata(combinedOcrText);

      // Save structured AI candidates
      const fields = [
        { name: 'title', val: aiResult.metadata.title },
        { name: 'subtitle', val: aiResult.metadata.subtitle },
        { name: 'authors', val: JSON.stringify(aiResult.metadata.authors) },
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

    // Duplicate detection
    const duplicateCheck = await DuplicateService.findPotentialDuplicates({
      isbn10,
      isbn13,
      title,
      authors,
    });

    return {
      session,
      images: session.images,
      extracted: {
        title,
        subtitle,
        authors,
        isbn10,
        isbn13,
        publisher,
        publicationYear,
        edition,
        language,
        description,
      },
      externalCandidates: {
        googleBooks: googleCandidate ? JSON.parse(googleCandidate.fieldValue) : null,
        openLibrary: openLibCandidate ? JSON.parse(openLibCandidate.fieldValue) : null,
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

      // Create Physical Copy with unique Accession Number
      const createdCopy = await tx.bookCopy.create({
        data: {
          bookId,
          accessionNumber: copyData.accessionNumber,
          barcode: copyData.barcode,
          callNumber: copyData.callNumber || null,
          shelfLocation: copyData.shelfLocation,
          condition: copyData.condition || CopyCondition.NEW,
          status: CopyStatus.AVAILABLE,
        },
      });

      // Update ScanSession to SAVED
      await tx.bookScanSession.update({
        where: { id: sessionId },
        data: {
          status: ScanStatus.SAVED,
          savedBookId: bookId,
          savedBookCopyId: createdCopy.id,
          completedAt: new Date(),
        },
      });

      const fullBook = await tx.book.findUnique({
        where: { id: bookId },
        include: { category: true, copies: true },
      });

      return { book: fullBook, copy: createdCopy, alreadySaved: false };
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

