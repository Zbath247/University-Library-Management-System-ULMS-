import { Request, Response } from 'express';
import { SettingsService } from './settings.service';
import { AuditService } from '../audit/audit.service';

export class SettingsController {
  static async getSettings(_req: Request, res: Response) {
    try {
      const data = await SettingsService.getAllSettings();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch settings' });
    }
  }

  static async updateSettings(req: Request, res: Response) {
    try {
      const updates = req.body;
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid settings payload' });
      }

      const updated = await SettingsService.updateSettings(updates);

      // Audit log
      const userId = (req.session as any)?.userId;
      if (userId) {
        await AuditService.log({
          userId,
          action: 'UPDATE',
          entity: 'SystemSetting',
          entityId: 'ALL',
          newValues: updates,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }).catch(() => {});
      }

      res.json({ success: true, data: updated, message: 'Settings saved successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to update settings' });
    }
  }
}

