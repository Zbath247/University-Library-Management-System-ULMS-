import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/enums';
import { TokenUtils } from '../utils/token.utils';

export function extractAuthUser(req: Request): { id: string; username: string; fullName: string; role: Role } | null {
  // 1. Check Bearer Token in Authorization header (Primary for Mobile & Cross-site CORS)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verified = TokenUtils.verifyToken(token);
    if (verified) {
      return {
        id: verified.userId,
        username: verified.username,
        fullName: verified.fullName,
        role: (verified.role as Role) || Role.STUDENT,
      };
    }
  }

  // 1b. Check query param token (e.g. direct browser downloads)
  const queryToken = req.query?.token as string | undefined;
  if (queryToken && typeof queryToken === 'string') {
    const verified = TokenUtils.verifyToken(queryToken);
    if (verified) {
      return {
        id: verified.userId,
        username: verified.username,
        fullName: verified.fullName,
        role: (verified.role as Role) || Role.STUDENT,
      };
    }
  }

  // 2. Fallback to Express session cookie
  if (req.session && req.session.userId) {
    return {
      id: req.session.userId,
      username: req.session.username || 'unknown',
      fullName: req.session.fullName || 'User',
      role: (req.session.role as Role) || Role.STUDENT,
    };
  }

  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = extractAuthUser(req);
  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please log in.',
      },
    });
    return;
  }

  req.user = user;
  if (req.session) {
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.fullName = user.fullName;
    req.session.role = user.role;
  }

  next();
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = extractAuthUser(req);
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }

    req.user = user;
    if (req.session) {
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.fullName = user.fullName;
      req.session.role = user.role;
    }

    next();
  };
}
