import { Router } from 'express';
import { CopyController } from './copy.controller';
import { requireRole, requireAuth } from '../../middleware/auth';
import { Role } from '../../types/enums';

const router = Router();

// Lookup copy by identifier (ID, accession number, barcode)
router.get('/lookup/:identifier', requireAuth, CopyController.lookup);

// Copies by book ID
router.get('/book/:bookId', CopyController.listByBook);

// Staff management
router.post('/', requireRole([Role.LIBRARIAN, Role.ADMIN]), CopyController.create);
router.put('/:copyId', requireRole([Role.LIBRARIAN, Role.ADMIN]), CopyController.update);
router.delete('/:copyId', requireRole([Role.LIBRARIAN, Role.ADMIN]), CopyController.delete);

export default router;

