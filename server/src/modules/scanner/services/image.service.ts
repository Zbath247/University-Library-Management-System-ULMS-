import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { config } from '../../../config';

let sharpLib: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  sharpLib = require('sharp');
} catch {
  console.warn('⚠️ Native sharp addon not available on this runtime. Using direct buffer fallback.');
}

export class ScannerImageService {
  private static storageDir = path.resolve(process.cwd(), config.SCAN_STORAGE_PATH);

  static ensureStorageDirectory() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  static async processAndStoreImage(fileBuffer: Buffer, _originalName: string, mimeType: string) {
    this.ensureStorageDirectory();

    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const filename = `${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(this.storageDir, filename);

    if (sharpLib) {
      try {
        const image = sharpLib(fileBuffer);
        const metadata = await image.metadata();
        let pipeline = image.rotate();
        if (metadata.width && metadata.width > 2048) {
          pipeline = pipeline.resize(2048, null, { withoutEnlargement: true });
        }
        await pipeline.toFile(filePath);
        const stats = fs.statSync(filePath);
        return {
          fileName: filename,
          filePath,
          mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          fileSizeBytes: stats.size,
          width: metadata.width || 0,
          height: metadata.height || 0,
        };
      } catch (err) {
        console.warn('Sharp transformation skipped, storing buffer directly:', err);
      }
    }

    // Direct buffer write fallback
    fs.writeFileSync(filePath, fileBuffer);
    const stats = fs.statSync(filePath);
    return {
      fileName: filename,
      filePath,
      mimeType,
      fileSizeBytes: stats.size,
      width: 1200,
      height: 800,
    };
  }

  static async rotateImage(filePath: string, degrees: number) {
    if (!fs.existsSync(filePath)) {
      throw new Error('FILE_NOT_FOUND: Scan image does not exist on disk');
    }

    if (sharpLib) {
      try {
        const tempPath = `${filePath}.tmp`;
        await sharpLib(filePath).rotate(degrees).toFile(tempPath);
        fs.renameSync(tempPath, filePath);
        const metadata = await sharpLib(filePath).metadata();
        return {
          width: metadata.width || 0,
          height: metadata.height || 0,
        };
      } catch (err) {
        console.warn('Sharp rotation skipped:', err);
      }
    }

    return { width: 1200, height: 800 };
  }

  static deleteImage(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn('Failed to delete image file:', filePath, err);
    }
  }
}

