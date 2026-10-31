import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/enums';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session || !req.session.userId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in.',
      },
    });
    return;
  }

  req.user = {
    id: req.session.userId,
    username: req.session.username || 'unknown',
    fullName: req.session.fullName || 'User',
    role: req.session.role || Role.STUDENT,
  };

  next();
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session || !req.session.userId || !req.session.role) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.session.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }

    req.user = {
      id: req.session.userId,
      username: req.session.username || 'unknown',
      fullName: req.session.fullName || 'User',
      role: req.session.role,
    };

    next();
  };
}

