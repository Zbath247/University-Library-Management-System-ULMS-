import bcrypt from 'bcryptjs';
import prisma from '../../db/prisma';
import { LoginInput } from './auth.schema';
import { User } from '@prisma/client';

export class AuthService {
  static async validateUser(input: LoginInput): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: input.username },
          { email: input.username },
        ],
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

