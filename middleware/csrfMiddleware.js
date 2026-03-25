/**
 * CSRF Protection Middleware
 * Provides CSRF token generation and verification
 */

import crypto from 'crypto';

/**
 * Store for CSRF tokens (in production use Redis or session store)
 */
const csrfTokens = new Map();

/**
 * Generate CSRF token
 */
export const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Middleware: Store CSRF token in session and pass to views
 */
export const csrfProtection = (req, res, next) => {
  // Initialize session CSRF token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }

  // Store token in session
  const token = req.session.csrfToken;
  csrfTokens.set(token, true);

  // Make token available in response locals
  res.locals.csrfToken = token;

  next();
};

/**
 * Middleware: Verify CSRF token on POST/PUT/DELETE requests
 */
export const verifyCSRFToken = (req, res, next) => {
  // Skip CSRF check for GET requests and specific endpoints
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF check for API endpoints (use header-based auth instead)
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Get CSRF token from request
  const tokenFromRequest = req.body._csrf || req.headers['x-csrf-token'];

  // Get token from session
  const tokenFromSession = req.session.csrfToken;

  // Verify token exists and matches
  if (!tokenFromRequest || !tokenFromSession || tokenFromRequest !== tokenFromSession) {
    console.warn('CSRF token mismatch', {
      path: req.path,
      sessionToken: tokenFromSession ? tokenFromSession.substring(0, 8) + '...' : 'missing',
      requestToken: tokenFromRequest ? tokenFromRequest.substring(0, 8) + '...' : 'missing'
    });

    req.flash('error_msg', 'Security validation failed. Please try again.');
    return res.status(403).redirect(req.header('referer') || '/');
  }

  next();
};

/**
 * Middleware: Regenerate CSRF token after successful login/logout
 */
export const regenerateCSRFToken = (req, res, next) => {
  // Generate new token
  const newToken = generateCSRFToken();
  req.session.csrfToken = newToken;
  res.locals.csrfToken = newToken;

  next();
};

/**
 * Clean up expired CSRF tokens (run periodically)
 */
export const cleanupCSRFTokens = () => {
  // In production, clean up tokens that are older than 1 hour
  // For now, this is a simple cleanup function
  if (csrfTokens.size > 10000) {
    // Reset if too many tokens accumulated
    csrfTokens.clear();
  }
};

// Run cleanup every 30 minutes
setInterval(cleanupCSRFTokens, 30 * 60 * 1000);
