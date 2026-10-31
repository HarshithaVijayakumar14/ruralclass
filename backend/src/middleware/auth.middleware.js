import { verifyUserToken, isSupabaseConfigured } from '../services/supabase.service.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!isSupabaseConfigured()) {
      // Local development / offline teacher mode
      req.user = await verifyUserToken(token || 'local-teacher-bearer-token');
      return next();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required. Please include Bearer <token> in Authorization header.'
      });
    }

    const user = await verifyUserToken(token);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed: ' + (err.message || 'Invalid token')
    });
  }
};

/**
 * Optional Auth Middleware:
 * If token present and valid, attaches user; otherwise leaves req.user = null.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const user = await verifyUserToken(token || 'local-dev-token');
    req.user = user;
  } catch (err) {
    req.user = null;
  }
  next();
};
