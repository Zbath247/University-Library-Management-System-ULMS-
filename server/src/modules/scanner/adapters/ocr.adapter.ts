import { IOcrAdapter, OcrResult } from '../types';
import { createWorker } from 'tesseract.js';

export class TesseractOcrAdapter implements IOcrAdapter {
  async extractText(imageBuffer: Buffer, _mimeType: string, languages: string[] = ['eng']): Promise<OcrResult> {
    const langString = languages.join('+');
    let worker;
    try {
      worker = await createWorker(langString);
      const ret = await worker.recognize(imageBuffer);
      await worker.terminate();

      return {
        rawText: ret.data.text,
        confidence: ret.data.confidence ? Math.round(ret.data.confidence * 100) / 100 : null,
        blocks: ret.data.blocks?.map((b) => ({
          text: b.text,
          confidence: b.confidence ? Math.round(b.confidence * 100) / 100 : null,
        })),
      };
    } catch (err) {
      if (worker) {
        await worker.terminate().catch(() => {});
      }
      console.error('Tesseract OCR error:', err);
      throw new Error(`OCR_EXTRACTION_FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

export class MockOcrAdapter implements IOcrAdapter {
  constructor(private fixtureResult?: OcrResult) {}

  async extractText(_imageBuffer: Buffer, _mimeType: string, _languages: string[]): Promise<OcrResult> {
    if (this.fixtureResult) return this.fixtureResult;

    return {
      rawText: `Introduction to Algorithms
Fourth Edition
Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein
The MIT Press, Cambridge, Massachusetts
ISBN 978-0-262-04630-5
Copyright 2022 Massachusetts Institute of Technology`,
      confidence: 94.5,
      blocks: [
        { text: 'Introduction to Algorithms Fourth Edition', confidence: 96.2 },
        { text: 'Thomas H. Cormen, Charles E. Leiserson', confidence: 95.0 },
        { text: 'ISBN 978-0-262-04630-5', confidence: 98.1 },
      ],
    };
  }
}

