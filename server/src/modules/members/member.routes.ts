import { Router } from 'express';
import { MemberController } from './member.controller';
import { requireRole } from '../../middleware/auth';
import { Role } from '../../types/enums';

const router = Router();

// Staff endpoints (Librarian & Admin)
router.get('/', requireRole([Role.LIBRARIAN, Role.ADMIN]), MemberController.search);
router.get('/code/:code', requireRole([Role.LIBRARIAN, Role.ADMIN]), MemberController.lookupByCode);
router.get('/:id', requireRole([Role.LIBRARIAN, Role.ADMIN]), MemberController.getById);
router.post('/', requireRole([Role.LIBRARIAN, Role.ADMIN]), MemberController.create);
router.put('/:id', requireRole([Role.LIBRARIAN, Role.ADMIN]), MemberController.update);
router.delete('/:id', requireRole([Role.ADMIN]), MemberController.delete);

export default router;

