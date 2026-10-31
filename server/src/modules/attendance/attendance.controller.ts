import { Request, Response } from 'express';
import { AttendanceService } from './attendance.service';

export class AttendanceController {
  /**
   * Public check-in endpoint (scanned QR code).
   */
  static async checkIn(req: Request, res: Response) {
    try {
      const {
        memberCode,
        fullName,
        fullNameEnglish,
        telegramUsername,
        memberType,
        gender,
        department,
        phoneNumber,
        purpose,
        purposeDetails,
        notes,
      } = req.body;

      if (!memberCode || !fullName || !department) {
        return res.status(400).json({
          success: false,
          error: 'សូមបំពេញព័ត៌មានចាំបាច់ (អត្តលេខ, ឈ្មោះពេញ, ដេប៉ាតឺម៉ង់) / Member Code, Full Name, and Department are required',
        });
      }

      const result = await AttendanceService.checkIn({
        memberCode,
        fullName,
        fullNameEnglish,
        telegramUsername,
        memberType,
        gender,
        department,
        phoneNumber,
        purpose: purpose || 'READING',
        purposeDetails,
        notes,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Check-in error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'បរាជ័យក្នុងការកត់ត្រាវត្តមាន / Failed to process check-in',
      });
    }
  }

  /**
   * Public check-out endpoint.
   */
  static async checkOut(req: Request, res: Response) {
    try {
      const { attendanceId, memberCode } = req.body;

      if (!attendanceId && !memberCode) {
        return res.status(400).json({
          success: false,
          error: 'ត្រូវការ Attendance ID ឬ Member Code ដើម្បីចាកចេញ / Attendance ID or Member Code required',
        });
      }

      const result = await AttendanceService.checkOut({ attendanceId, memberCode });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Check-out error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'បរាជ័យក្នុងការកត់ត្រាការចាកចេញ / Failed to process check-out',
      });
    }
  }

  /**
   * Quick visitor profile lookup by Student ID or Phone number.
   */
  static async lookup(req: Request, res: Response) {
    try {
      const { query } = req.params;
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Query parameter required' });
      }

      const data = await AttendanceService.lookupVisitor(query);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Lookup error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Lookup failed',
      });
    }
  }

  /**
   * Get active visitors currently in the library (Staff view).
   */
  static async getActive(req: Request, res: Response) {
    try {
      const data = await AttendanceService.getActiveVisitors();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get attendance statistics (Staff view).
   */
  static async getStats(req: Request, res: Response) {
    try {
      const data = await AttendanceService.getStats();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get filtered attendance history (Staff view).
   */
  static async getHistory(req: Request, res: Response) {
    try {
      const { date, department, purpose, status, search, page, limit } = req.query;

      const data = await AttendanceService.getHistory({
        date: date as string,
        department: department as string,
        purpose: purpose as string,
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Manual checkout by Staff.
   */
  static async manualCheckOut(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AttendanceService.checkOut({ attendanceId: id });
      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Get all pending borrow/return requests (Staff view).
   */
  static async getPending(req: Request, res: Response) {
    try {
      const data = await AttendanceService.getPendingRequests();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Approve a pending borrow/return request (Staff action).
   */
  static async approve(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const data = await AttendanceService.approveRequest(id, notes);
      return res.status(200).json({
        success: true,
        data,
        message: 'បានអនុម័តសំណើខ្ចី/សងដោយជោគជ័យ / Approved successfully',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Reject a pending borrow/return request (Staff action).
   */
  static async reject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const data = await AttendanceService.rejectRequest(id, reason);
      return res.status(200).json({
        success: true,
        data,
        message: 'បានបដិសេធសំណើខ្ចី/សង / Rejected request',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Update attendance record (Admin only).
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await AttendanceService.updateAttendance(id, req.body);
      return res.status(200).json({
        success: true,
        data,
        message: 'បានកែប្រែកំណត់ត្រាវត្តមានដោយជោគជ័យ / Updated attendance successfully',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Delete attendance record (Admin only).
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await AttendanceService.deleteAttendance(id);
      return res.status(200).json({
        success: true,
        message: 'បានលុបកំណត់ត្រាវត្តមានដោយជោគជ័យ / Deleted attendance successfully',
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }
}

