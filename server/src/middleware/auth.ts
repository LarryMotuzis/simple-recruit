import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken, type Role } from '../lib/tokens.js';

/**
 * Verifies the Bearer access token and attaches the decoded user to req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restricts a route to one or more roles. Use after requireAuth.
 *   router.post('/', requireAuth, requireRole('head_coach', 'assistant'), handler)
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    // admin bypasses all role checks
    if (req.user.role !== 'admin' && !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
