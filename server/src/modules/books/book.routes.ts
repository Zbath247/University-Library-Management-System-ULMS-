import { Router } from 'express';
import multer from 'multer';
import { BookController } from './book.controller';
import { requireRole } from '../../middleware/auth';
import { Role } from '../../types/enums';

const router = Router();

const uploadCover = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_MIME_TYPE: Only JPEG, PNG, and WebP images are permitted'));
    }
  },
});

// Publicly accessible catalog search and view
router.get('/', BookController.search);
router.get('/:id', BookController.getById);

// Staff-only management (Librarian & Admin)
router.post('/upload-cover', requireRole([Role.LIBRARIAN, Role.ADMIN]), uploadCover.single('image'), BookController.uploadCover);
router.post('/batch-delete', requireRole([Role.ADMIN]), BookController.batchDelete);
router.post('/', requireRole([Role.LIBRARIAN, Role.ADMIN]), BookController.create);
router.put('/:id', requireRole([Role.LIBRARIAN, Role.ADMIN]), BookController.update);
router.delete('/clear-all', requireRole([Role.ADMIN]), BookController.clearAll);
router.delete('/:id', requireRole([Role.LIBRARIAN, Role.ADMIN]), BookController.delete);

export default router;

