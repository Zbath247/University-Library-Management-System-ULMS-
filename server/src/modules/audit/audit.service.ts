import prisma from '../../db/prisma';

export interface AuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

function sanitizeValues(obj?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!obj) return null;
  const sanitized = { ...obj };
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

export class AuditService {
  static async log(params: AuditLogParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || null,
          oldValues: sanitizeValues(params.oldValues) ? JSON.stringify(sanitizeValues(params.oldValues)) : null,
          newValues: sanitizeValues(params.newValues) ? JSON.stringify(sanitizeValues(params.newValues)) : null,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Non-blocking for core operations
    }
  }

  static async getLogs(limit = 100, offset = 0, entity?: string) {
    const where = entity ? { entity } : {};
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, fullName: true, role: true },
          },
        },
      }),
    ]);
    return { total, logs };
  }
}

