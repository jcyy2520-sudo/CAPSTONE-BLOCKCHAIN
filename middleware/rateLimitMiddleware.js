/**
 * Rate Limiting Middleware
 * Provides request rate limiting and DDoS protection
 */

/**
 * In-memory store for rate limiting
 * In production, use Redis
 */
const rateLimitStore = new Map();

/**
 * Clean up expired entries (run periodically)
 */
const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
};

// Run cleanup every minute
setInterval(cleanupExpiredEntries, 60 * 1000);

/**
 * Generic rate limiter factory
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    keyGenerator = (req) => req.ip,
    message = 'Too many requests, please try again later'
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create entry for this key
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, entry);
      return next();
    }

    // Increment counter
    entry.count++;

    // Check if exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      console.warn('Rate limit exceeded', {
        key,
        count: entry.count,
        maxRequests,
        path: req.path
      });

      if (req.accepts('json')) {
        return res.status(429).json({
          error: 'Too many requests',
          message,
          retryAfter
        });
      }

      req.flash('error_msg', message);
      return res.status(429).redirect(req.header('referer') || '/');
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    next();
  };
};

/**
 * Global rate limiter
 * Limits all requests per IP
 */
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000,
  message: 'Too many requests from this IP, please try again later'
});

/**
 * Login rate limiter
 * Stricter limits for login attempts
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // Only 5 attempts per 15 minutes
  keyGenerator: (req) => `login_${req.ip}`,
  message: 'Too many login attempts, please try again later'
});

/**
 * API rate limiter
 * Moderate limits for API endpoints
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: (req) => {
    // Rate limit per user if authenticated, per IP otherwise
    return req.user?.id ? `api_${req.user.id}` : `api_${req.ip}`;
  },
  message: 'API rate limit exceeded'
});

/**
 * Bid submission rate limiter
 * Prevent rapid bid submission spam
 */
export const bidSubmissionRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // Only 10 bid submissions per hour per user
  keyGenerator: (req) => `bid_${req.session?.user?.id || req.ip}`,
  message: 'Too many bid submissions, please try again later'
});

/**
 * Application submission rate limiter
 * Prevent application spam
 */
export const applicationRateLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 3, // Only 3 applications per 24 hours per IP
  keyGenerator: (req) => `application_${req.ip}`,
  message: 'Too many applications submitted, please try again tomorrow'
});

/**
 * File download rate limiter
 * Prevent excessive file downloads
 */
export const downloadRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 50, // Only 50 downloads per 10 minutes
  keyGenerator: (req) => `download_${req.session?.user?.id || req.ip}`,
  message: 'Download rate limit exceeded'
});

/**
 * Form submission rate limiter
 * Prevent form spam
 */
export const formSubmissionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // Only 5 form submissions per minute
  keyGenerator: (req) => `form_${req.path}_${req.session?.user?.id || req.ip}`,
  message: 'Form submission rate limit exceeded'
});

/**
 * Account creation rate limiter
 * Prevent account creation spam
 */
export const accountCreationRateLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 5, // Only 5 accounts per 24 hours per IP
  keyGenerator: (req) => `account_${req.ip}`,
  message: 'Too many account creation attempts, please try again tomorrow'
});

/**
 * Sensitive operation rate limiter
 * Strict limits for sensitive operations (delete, admin actions, etc.)
 */
export const sensitiveOperationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // Only 20 sensitive operations per hour
  keyGenerator: (req) => `sensitive_${req.session?.user?.id}`,
  message: 'Too many sensitive operations, please try again later'
});

/**
 * Advanced rate limiter with custom logic
 */
export const advancedRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    maxRequests = 100,
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    // Skip counting if configured
    if (skipSuccessfulRequests && res.statusCode < 400) {
      return next();
    }

    if (skipFailedRequests && res.statusCode >= 400) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
        requests: []
      };
      rateLimitStore.set(key, entry);
      return next();
    }

    entry.count++;
    entry.requests.push({
      method: req.method,
      path: req.path,
      timestamp: now
    });

    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000));
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    next();
  };
};

/**
 * Get rate limit status for a key
 */
export const getRateLimitStatus = (key) => {
  const entry = rateLimitStore.get(key);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now > entry.resetTime) {
    rateLimitStore.delete(key);
    return null;
  }

  return {
    count: entry.count,
    resetTime: entry.resetTime,
    remainingTime: entry.resetTime - now
  };
};

/**
 * Clear rate limit for a key
 */
export const clearRateLimit = (key) => {
  rateLimitStore.delete(key);
};

/**
 * Get all rate limits (for admin purposes)
 */
export const getAllRateLimits = () => {
  const limits = [];
  const now = Date.now();

  for (const [key, data] of rateLimitStore.entries()) {
    if (now <= data.resetTime) {
      limits.push({
        key,
        count: data.count,
        resetTime: new Date(data.resetTime).toISOString()
      });
    }
  }

  return limits;
};

/**
 * Reset all rate limits (for admin/testing purposes)
 */
export const resetAllRateLimits = () => {
  rateLimitStore.clear();
};
