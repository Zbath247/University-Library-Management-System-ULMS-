import * as path from 'path';
import { IOcrAdapter, OcrResult } from '../types';
import { createWorker } from 'tesseract.js';

export class TesseractOcrAdapter implements IOcrAdapter {
  private static workerPromise: Promise<any> | null = null;

  private static async getWorker(): Promise<any> {
    if (!this.workerPromise) {
      this.workerPromise = (async () => {
        // Point cachePath to local server directory where eng.traineddata and khm.traineddata exist
        const cachePath = path.resolve(process.cwd());
        const worker = await createWorker('eng+khm', 1, {
          cachePath,
          gzip: false,
        });
        return worker;
      })();
    }
    return this.workerPromise;
  }

  async extractText(imageBuffer: Buffer, _mimeType: string, _languages: string[] = ['eng']): Promise<OcrResult> {
    try {
      const worker = await TesseractOcrAdapter.getWorker();
      const ret = await worker.recognize(imageBuffer);

      return {
        rawText: ret.data.text,
        confidence: ret.data.confidence ? Math.round(ret.data.confidence * 100) / 100 : null,
        blocks: ret.data.blocks?.map((b: any) => ({
          text: b.text,
          confidence: b.confidence ? Math.round(b.confidence * 100) / 100 : null,
        })),
      };
    } catch (err) {
      console.error('Tesseract OCR error:', err);
      // Reset cached worker on error so it can recover on subsequent runs
      TesseractOcrAdapter.workerPromise = null;
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

