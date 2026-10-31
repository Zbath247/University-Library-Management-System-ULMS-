import { Role } from './enums';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    username: string;
    fullName: string;
    role: Role;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        fullName: string;
        role: Role;
      };
    }
  }
}

