import { Router } from 'express';
import { LoanController } from './loan.controller';
import { requireRole } from '../../middleware/auth';
import { Role } from '../../types/enums';

const router = Router();

// Circulation desk endpoints (Librarian & Admin)
router.post('/issue', requireRole([Role.LIBRARIAN, Role.ADMIN]), LoanController.issue);
router.post('/return', requireRole([Role.LIBRARIAN, Role.ADMIN]), LoanController.return);
router.post('/renew', requireRole([Role.LIBRARIAN, Role.ADMIN]), LoanController.renew);
router.get('/active', requireRole([Role.LIBRARIAN, Role.ADMIN]), LoanController.getActive);
router.get('/overdue', requireRole([Role.LIBRARIAN, Role.ADMIN]), LoanController.getOverdue);

export default router;

