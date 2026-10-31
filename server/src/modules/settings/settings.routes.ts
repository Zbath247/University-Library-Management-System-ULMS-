import { Router } from 'express';
import { SettingsController } from './settings.controller';
import { requireRole } from '../../middleware/auth';
import { Role } from '../../types/enums';

const router = Router();

// Publicly readable so mobile/client can access campus location, shelf locations, and library hours
router.get('/', SettingsController.getSettings);

// Only Staff/Admin can update settings
router.put('/', requireRole([Role.ADMIN, Role.LIBRARIAN]), SettingsController.updateSettings);

export default router;

