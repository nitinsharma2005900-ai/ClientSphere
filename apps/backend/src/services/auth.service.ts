// ClientSphere Authentication & Token Lifecycle Service
// Developer: Nitin Sharma

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/client';
import { config } from '../config';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import { UserRole } from '@clientsphere/shared-types';

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  public static async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  public static generateAccessToken(user: { id: string; email: string; role: string; organizationId: string; firstName: string; lastName: string }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );
  }

  public static async generateRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.refreshToken.create({
      data: {
        userId,
        tokenHash,
        revoked: false,
        expiresAt,
      }
    });

    return rawToken;
  }

  public static async refreshAccessToken(rawRefreshToken: string) {
    if (typeof rawRefreshToken !== 'string' || rawRefreshToken.length !== 80) throw new UnauthorizedError('Invalid refresh token');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const storedToken = await db.refreshToken.findUnique({
      where: { tokenHash }
    });

    if (!storedToken || storedToken.revoked || new Date(storedToken.expiresAt) < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token. Please sign in again.');
    }

    const user = await db.user.findUnique({
      where: { id: storedToken.userId }
    });

    if (!user) {
      throw new NotFoundError('User associated with refresh token');
    }

    const newAccessToken = this.generateAccessToken(user);
    return { accessToken: newAccessToken };
  }

  public static async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    if (typeof rawRefreshToken !== 'string' || rawRefreshToken.length !== 80) throw new UnauthorizedError('Invalid refresh token');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    try {
      await db.refreshToken.update({
        where: { tokenHash },
        data: { revoked: true }
      });
    } catch {}
  }
}
