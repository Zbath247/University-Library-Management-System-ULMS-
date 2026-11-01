import * as crypto from 'crypto';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  exp: number;
}

export class TokenUtils {
  private static secret = config.SESSION_SECRET || 'duc-library-token-secret-2026';

  static generateToken(user: { id: string; username: string; fullName: string; role: string }): string {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      exp: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days valid
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(encodedPayload)
      .digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  static verifyToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;
      const [encodedPayload, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', this.secret)
        .update(encodedPayload)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
      }

      const payload: TokenPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      if (Date.now() > payload.exp) {
        return null; // Expired
      }
      return payload;
    } catch {
      return null;
    }
  }
}
