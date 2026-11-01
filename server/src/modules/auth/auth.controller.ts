import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { loginSchema } from './auth.schema';
import { AuditService } from '../audit/audit.service';
import { Role } from '../../types/enums';
import { TokenUtils } from '../../utils/token.utils';
import { extractAuthUser } from '../../middleware/auth';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login details',
          details: parseResult.error.errors,
        },
      });
      return;
    }

    const user = await AuthService.validateUser(parseResult.data);
    if (!user) {
      await AuditService.log({
        action: 'LOGIN_FAILED',
        entity: 'USER',
        oldValues: { username: parseResult.data.username },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect username/email or password',
        },
      });
      return;
    }

    // Regenerate session to prevent session fixation
    req.session.regenerate(async (err) => {
      if (err) {
        res.status(500).json({
          success: false,
          error: { code: 'SESSION_ERROR', message: 'Failed to initialize session' },
        });
        return;
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.fullName = user.fullName;
      req.session.role = user.role as Role;

      await AuditService.log({
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        entity: 'USER',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      const token = TokenUtils.generateToken({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
          },
        },
      });
    });
  }

  static async me(req: Request, res: Response): Promise<void> {
    const authUser = extractAuthUser(req);
    if (!authUser) {
      res.json({
        success: true,
        data: { user: null },
      });
      return;
    }

    const user = await AuthService.getUserById(authUser.id);
    res.json({
      success: true,
      data: { user },
    });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const userId = req.session?.userId;
    req.session.destroy(async (err) => {
      if (err) {
        res.status(500).json({
          success: false,
          error: { code: 'LOGOUT_ERROR', message: 'Failed to destroy session' },
        });
        return;
      }

      res.clearCookie('connect.sid');

      if (userId) {
        await AuditService.log({
          userId,
          action: 'LOGOUT',
          entity: 'USER',
          entityId: userId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }

      res.json({
        success: true,
        message: 'Successfully logged out',
      });
    });
  }
}

