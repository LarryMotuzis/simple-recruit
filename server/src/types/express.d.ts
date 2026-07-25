import 'express';
import type { TokenUser } from '../lib/tokens.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenUser;
    }
  }
}
