import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import config from '../config';
import AppError from '../utils/AppError';
import { User } from '../modules/user/user.model';
import { UserRole } from '../modules/user/user.interface';

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload & {
                userId: string;
                email: string;
                role: UserRole;
            };
            /**
             * The caller's partner profile (Company / Dealer / Retailer / …),
             * attached by `requirePartner`. Every partner-scoped handler reads
             * its `_id` from here rather than trusting a body field — that is
             * what stops one company editing another's products.
             */
            partner?: { _id: unknown; status: string;[k: string]: unknown };
        }
    }
}

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError(401, 'You are not logged in. Please login to continue.');
        }

        const token = authHeader.split(' ')[1];
        if (!token) throw new AppError(401, 'Invalid authentication token.');

        const decoded = jwt.verify(token, config.jwt.access_secret) as JwtPayload & {
            userId: string;
            email: string;
            role: UserRole;
        };

        const user = await User.findById(decoded.userId);
        if (!user) throw new AppError(401, 'User belonging to this token no longer exists.');
        if (user.isDeleted) throw new AppError(401, 'This user account has been deleted.');
        if (user.status === 'blocked') throw new AppError(403, 'Your account has been blocked. Contact support.');

        // Trust the database, not the token, for the role. A customer who
        // applies as a dealer is promoted mid-session, and an admin who is
        // demoted must lose access immediately — neither should have to wait
        // for the access token to expire.
        req.user = { ...decoded, role: user.role };
        next();
    } catch (error) {
        next(error);
    }
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Admin is the single full-power role — always allowed on any authorized
        // route (so the admin panel's API calls never 403).
        const allowed = !!req.user && (req.user.role === 'admin' || allowedRoles.includes(req.user.role));
        if (!allowed) {
            throw new AppError(403, 'You do not have permission to perform this action.');
        }
        next();
    };
};

/**
 * Permission-based authorization.
 * There is one full-power `admin` role that holds every permission, so admin
 * bypasses all permission checks; everyone else is denied.
 */
export const authorizePermission = (..._requiredPerms: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) throw new AppError(401, 'You are not logged in. Please login to continue.');

            // The single admin role bypasses all permission checks.
            if (req.user.role === 'admin') return next();

            throw new AppError(403, 'You do not have permission to perform this action.');
        } catch (error) {
            next(error);
        }
    };
};

export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token) {
                try {
                    const decoded = jwt.verify(token, config.jwt.access_secret) as JwtPayload & {
                        userId: string;
                        email: string;
                        role: UserRole;
                    };
                    req.user = decoded;
                } catch {
                    // ignore invalid token for optional auth
                }
            }
        }
        next();
    } catch (error) {
        next(error);
    }
};
