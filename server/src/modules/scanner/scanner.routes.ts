import { Router } from 'express';
import multer from 'multer';
import { ScannerController } from './scanner.controller';
import { requireRole } from '../../middleware/auth';
import { Role } from '../../types/enums';
import { config } from '../../config';

const router = Router();

// Multer memory storage with file type filtering and configurable size limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_MIME_TYPE: Only JPEG, PNG, and WebP images are permitted'));
    }
  },
});

// All scanner endpoints require Librarian or Admin role
router.use(requireRole([Role.LIBRARIAN, Role.ADMIN]));

router.post('/', ScannerController.createSession);
router.post('/:id/images', upload.single('image'), ScannerController.uploadImage);
router.post('/:id/images/:imageId/rotate', ScannerController.rotateImage);
router.get('/:id/images/:imageId', ScannerController.streamImage);
router.post('/:id/process', ScannerController.processOcr);
router.get('/:id/review', ScannerController.getReview);
router.post('/:id/approve', ScannerController.approve);
router.post('/:id/cancel', ScannerController.cancel);

export default router;

