/**
 * Validation and Security Utilities
 * Input validation, file security, CSRF protection
 */

import crypto from 'crypto';

class SecurityUtilities {
  /**
   * Validate email format
   */
  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Validate phone number (Philippine format)
   */
  validatePhoneNumber(phone) {
    const regex = /^(\+63|0)?[0-9]{10}$/;
    return regex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Validate TIN format
   */
  validateTIN(tin) {
    const regex = /^[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]{3}$/;
    return regex.test(tin);
  }

  /**
   * Validate bid amount
   */
  validateBidAmount(amount, minAmount, maxAmount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= minAmount && num <= maxAmount;
  }

  /**
   * Validate file type and size
   */
  validateFile(file, allowedTypes, maxSizeInMB) {
    if (!file) return false;

    const fileSizeInMB = file.size / (1024 * 1024);
    const fileExtension = file.originalname.split('.').pop();

    return allowedTypes.includes(fileExtension.toLowerCase()) &&
           fileSizeInMB <= maxSizeInMB;
  }

  /**
   * Sanitize filename to prevent directory traversal
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify CSRF token
   */
  verifyCSRFToken(token, sessionToken) {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(sessionToken)
    );
  }

  /**
   * Rate limiting helper
   */
  createRateLimiter(maxAttempts, windowMs) {
    const attempts = new Map();

    return (identifier) => {
      const now = Date.now();
      const userAttempts = attempts.get(identifier) || [];

      // Remove old attempts
      const recentAttempts = userAttempts.filter(time => now - time < windowMs);

      if (recentAttempts.length >= maxAttempts) {
        return false; // Rate limited
      }

      recentAttempts.push(now);
      attempts.set(identifier, recentAttempts);
      return true; // Allowed
    };
  }

  /**
   * Hash password (bcrypt already used, but can add additional layers)
   */
  hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate secure random string
   */
  generateSecureString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * IP address validation (ipv4 and ipv6)
   */
  validateIPAddress(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * SQL injection detection (basic)
   */
  detectSQLInjection(input) {
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION',
                         'EXEC', 'EXECUTE', 'DECLARE', 'CAST', 'SCRIPT'];
    const upperInput = input.toUpperCase();
    return sqlKeywords.some(keyword => upperInput.includes(keyword));
  }

  /**
   * XSS prevention - sanitize HTML
   */
  sanitizeHTML(input) {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate procurement dates
   */
  validateProcurementDates(openingDate, closingDate) {
    const now = new Date();
    const opening = new Date(openingDate);
    const closing = new Date(closingDate);

    return opening >= now && closing > opening;
  }

  /**
   * Check if bid is on time
   */
  isBidOnTime(submissionDate, closingDate) {
    return new Date(submissionDate) <= new Date(closingDate);
  }

  /**
   * Calculate bidding statistics
   */
  calculateBiddingStats(bids) {
    if (bids.length === 0) {
      return {
        total_bids: 0,
        average_bid: 0,
        highest_bid: 0,
        lowest_bid: 0,
        bid_range: 0
      };
    }

    const amounts = bids.map(b => parseFloat(b.bid_amount));
    const total = amounts.reduce((a, b) => a + b, 0);
    const average = total / amounts.length;
    const highest = Math.max(...amounts);
    const lowest = Math.min(...amounts);

    return {
      total_bids: bids.length,
      average_bid: average.toFixed(2),
      highest_bid: highest.toFixed(2),
      lowest_bid: lowest.toFixed(2),
      bid_range: (highest - lowest).toFixed(2)
    };
  }
}

export default new SecurityUtilities();
