import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { requireRole } from '../../middleware/auth';
import { Role } from '../../types/enums';

const router = Router();

// Public Entrance Check-in & Check-out (Scanned via mobile QR Code)
router.post('/check-in', AttendanceController.checkIn);
router.post('/check-out', AttendanceController.checkOut);
router.get('/lookup/:query', AttendanceController.lookup);

// Staff Dashboard & Attendance Log endpoints
router.get('/active', requireRole([Role.LIBRARIAN, Role.ADMIN]), AttendanceController.getActive);
router.get('/pending', requireRole([Role.LIBRARIAN, Role.ADMIN]), AttendanceController.getPending);
router.get('/stats', requireRole([Role.LIBRARIAN, Role.ADMIN]), AttendanceController.getStats);
router.get('/history', requireRole([Role.LIBRARIAN, Role.ADMIN]), AttendanceController.getHistory);
router.post('/:id/checkout', requireRole([Role.LIBRARIAN, Role.ADMIN]), AttendanceController.manualCheckOut);
router.post('/:id/approve', requireRole([Role.LIBRARIAN, Role.ADMIN]), AttendanceController.approve);
router.post('/:id/reject', requireRole([Role.LIBRARIAN, Role.ADMIN]), AttendanceController.reject);
router.put('/:id', requireRole([Role.ADMIN]), AttendanceController.update);
router.delete('/:id', requireRole([Role.ADMIN]), AttendanceController.delete);

export default router;

