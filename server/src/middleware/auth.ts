import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/utils';

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 * Adds userId and username to request object
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Add user info to request object
    (req as any).userId = decoded.userId;
    (req as any).username = decoded.username;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication middleware
 * Adds user info if token is valid, but doesn't block unauthenticated requests
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      (req as any).userId = decoded.userId;
      (req as any).username = decoded.username;
    }

    next();
  } catch (error) {
    // Token is invalid, but we don't block the request
    next();
  }
}
