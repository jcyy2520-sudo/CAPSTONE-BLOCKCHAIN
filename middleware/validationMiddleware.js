/**
 * Input Validation Middleware
 * Provides data validation, sanitization, and security checks
 */

import { body, validationResult, param, query } from 'express-validator';

/**
 * Middleware: Check for validation errors and respond
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log validation failures
    console.warn('Validation errors:', {
      path: req.path,
      errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
    });

    // For API requests, return JSON
    if (req.accepts('json')) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(e => ({
          field: e.param,
          message: e.msg
        }))
      });
    }

    // For form submissions, redirect with flash
    req.flash('error_msg', 'Validation failed. Please review your input.');
    return res.status(400).redirect(req.header('referer') || '/');
  }

  next();
};

/**
 * Bid submission validation
 */
export const validateBidSubmission = [
  body('bid_amount')
    .trim()
    .notEmpty()
    .withMessage('Bid amount is required')
    .isDecimal({ decimal_digits: '1,2' })
    .withMessage('Bid amount must be a valid decimal')
    .toFloat(),

  body('bid_currency')
    .optional()
    .trim()
    .matches(/^[A-Z]{3}$/)
    .withMessage('Currency must be a valid 3-letter code'),

  handleValidationErrors
];

/**
 * Bid evaluation validation
 */
export const validateBidEvaluation = [
  body('technical_score')
    .notEmpty()
    .withMessage('Technical score is required')
    .isDecimal({ decimal_digits: '1,2' })
    .withMessage('Technical score must be a decimal')
    .custom(value => {
      const score = parseFloat(value);
      if (score < 0 || score > 100) {
        throw new Error('Score must be between 0 and 100');
      }
      return true;
    })
    .toFloat(),

  body('financial_score')
    .notEmpty()
    .withMessage('Financial score is required')
    .isDecimal({ decimal_digits: '1,2' })
    .withMessage('Financial score must be a decimal')
    .custom(value => {
      const score = parseFloat(value);
      if (score < 0 || score > 100) {
        throw new Error('Score must be between 0 and 100');
      }
      return true;
    })
    .toFloat(),

  body('technical_remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Technical remarks cannot exceed 1000 characters'),

  body('financial_remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Financial remarks cannot exceed 1000 characters'),

  body('evaluator_remarks')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Evaluator remarks cannot exceed 1000 characters'),

  handleValidationErrors
];

/**
 * Award issuance validation
 */
export const validateAwardIssuance = [
  body('winning_bid_id')
    .notEmpty()
    .withMessage('Winning bid is required')
    .isInt()
    .withMessage('Winning bid ID must be an integer')
    .toInt(),

  handleValidationErrors
];

/**
 * Contract creation validation
 */
export const validateContractCreation = [
  body('contract_start_date')
    .notEmpty()
    .withMessage('Contract start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date'),

  body('contract_end_date')
    .notEmpty()
    .withMessage('Contract end date is required')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.contract_start_date);
      const endDate = new Date(value);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('payment_terms')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Payment terms cannot exceed 500 characters'),

  handleValidationErrors
];

/**
 * Application submission validation
 */
export const validateApplicationSubmission = [
  body('company_name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Company name must be between 3 and 255 characters'),

  body('contact_person')
    .trim()
    .notEmpty()
    .withMessage('Contact person name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Contact person name must be between 3 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(\+63|0)[0-9]{10}$/)
    .withMessage('Phone number must be valid Philippine format'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 255 })
    .withMessage('Address must be between 5 and 255 characters'),

  body('tax_identification')
    .trim()
    .notEmpty()
    .withMessage('TIN is required')
    .matches(/^[0-9]{12}$/)
    .withMessage('TIN must be 12 digits'),

  handleValidationErrors
];

/**
 * Procurement template validation
 */
export const validateProcurementTemplate = [
  body('mode')
    .trim()
    .notEmpty()
    .withMessage('Procurement mode is required')
    .isIn([
      'NPS', 'GPS', 'CCS', 'SVP', 'NC', 'SC', 'DCP', 'SRPD', 'NWCA', 'SLSC', 'AC'
    ])
    .withMessage('Invalid procurement mode'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  handleValidationErrors
];

/**
 * Procurement creation validation
 */
export const validateProcurementCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Procurement title is required')
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('mode')
    .trim()
    .notEmpty()
    .withMessage('Procurement mode is required')
    .isIn([
      'NPS', 'GPS', 'CCS', 'SVP', 'NC', 'SC', 'DCP', 'SRPD', 'NWCA', 'SLSC', 'AC'
    ])
    .withMessage('Invalid procurement mode'),

  body('abc')
    .notEmpty()
    .withMessage('ABC is required')
    .isDecimal()
    .withMessage('ABC must be a valid amount')
    .toFloat(),

  body('bid_opening_date')
    .notEmpty()
    .withMessage('Bid opening date is required')
    .isISO8601()
    .withMessage('Bid opening date must be valid'),

  body('bid_closing_date')
    .notEmpty()
    .withMessage('Bid closing date is required')
    .isISO8601()
    .withMessage('Bid closing date must be valid')
    .custom((value, { req }) => {
      const openDate = new Date(req.body.bid_opening_date);
      const closeDate = new Date(value);
      if (closeDate <= openDate) {
        throw new Error('Closing date must be after opening date');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Parameter validation helpers
 */
export const validateID = param('id')
  .isInt()
  .withMessage('Invalid ID format')
  .toInt();

export const validateProcurementID = param('procurementId')
  .isInt()
  .withMessage('Invalid procurement ID')
  .toInt();

export const validateBidID = param('bidId')
  .isInt()
  .withMessage('Invalid bid ID')
  .toInt();

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (req, res, next) => {
  // Sanitize common fields
  const fieldsToSanitize = [
    'title', 'description', 'company_name', 'contact_person',
    'address', 'notes', 'remarks', 'technical_remarks',
    'financial_remarks', 'evaluator_remarks'
  ];

  fieldsToSanitize.forEach(field => {
    if (req.body[field] && typeof req.body[field] === 'string') {
      // Remove any HTML tags and trim
      req.body[field] = req.body[field]
        .replace(/<[^>]*>/g, '')
        .trim();
    }
  });

  next();
};

/**
 * Validate file uploads
 */
export const validateFileUpload = {
  validateDocuments: (allowedMimes = ['application/pdf', 'application/msword']) => {
    return (req, res, next) => {
      if (!req.files || Object.keys(req.files).length === 0) {
        return next();
      }

      // Check each file
      for (const [fieldName, files] of Object.entries(req.files)) {
        if (Array.isArray(files)) {
          files.forEach(file => {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
              return res.status(400).json({
                success: false,
                error: `File ${file.originalname} exceeds 10MB limit`
              });
            }

            // Check MIME type
            if (!allowedMimes.includes(file.mimetype)) {
              return res.status(400).json({
                success: false,
                error: `File type ${file.mimetype} not allowed for ${fieldName}`
              });
            }
          });
        }
      }

      next();
    };
  }
};

/**
 * XSS Prevention
 */
export const preventXSS = (req, res, next) => {
  // Check for common XSS patterns in request body
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        if (checkValue(value[key])) {
          return true;
        }
      }
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query)) {
    console.warn('XSS attempt detected', {
      path: req.path,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid input detected'
    });
  }

  next();
};
