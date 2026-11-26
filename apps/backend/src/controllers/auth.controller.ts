// ClientSphere Authentication Controller
// Developer: Nitin Sharma

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { AuthService } from '../services/auth.service';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export class AuthController {
  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Validation failed for credentials', validation.error.format());
      }

      const { email, password } = validation.data;
      const user = await db.user.findFirst({
        where: { email: email.toLowerCase().trim() }
      });

      if (!user) {
        throw new UnauthorizedError('Invalid email or password.');
      }

      const isMatch = await AuthService.verifyPassword(password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedError('Invalid email or password.');
      }

      const organization = await db.organization.findUnique({
        where: { id: user.organizationId }
      });

      const accessToken = AuthService.generateAccessToken(user);
      const refreshToken = await AuthService.generateRefreshToken(user.id);

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            department: user.department,
            organizationId: user.organizationId,
            organizationName: organization?.name || 'ClientSphere Org',
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: configExpiresInSeconds(),
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const result = await AuthService.refreshAccessToken(refreshToken);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await AuthService.revokeRefreshToken(refreshToken);
      }
      return res.status(200).json({
        success: true,
        message: 'Successfully logged out and session revoked.'
      });
    } catch (err) {
      next(err);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const user = await db.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        throw new UnauthorizedError('User session invalid.');
      }

      const organization = await db.organization.findUnique({
        where: { id: user.organizationId }
      });

      return res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          organizationId: user.organizationId,
          organizationName: organization?.name || 'ClientSphere Org',
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

function configExpiresInSeconds(): number {
  return 900; // 15 minutes
}
