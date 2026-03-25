/**
 * Handlebars Helper Functions
 * Custom helpers for template rendering
 */

import moment from 'moment';

export const registerHelpers = (hbs) => {
  /**
   * Format currency
   */
  hbs.registerHelper('formatCurrency', (value) => {
    if (!value) return '0.00';
    return parseFloat(value).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  });

  /**
   * Format date
   */
  hbs.registerHelper('formatDate', (date) => {
    if (!date) return '';
    return moment(date).format('MMM DD, YYYY');
  });

  /**
   * Format datetime
   */
  hbs.registerHelper('formatDateTime', (date) => {
    if (!date) return '';
    return moment(date).format('MMM DD, YYYY hh:mm A');
  });

  /**
   * Convert to uppercase
   */
  hbs.registerHelper('toUpper', (value) => {
    return value ? value.toString().toUpperCase() : '';
  });

  /**
   * Convert to lowercase
   */
  hbs.registerHelper('toLower', (value) => {
    return value ? value.toString().toLowerCase() : '';
  });

  /**
   * Equality check
   */
  hbs.registerHelper('eq', (a, b, options) => {
    if (a === b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /**
   * Not equal check
   */
  hbs.registerHelper('ne', (a, b, options) => {
    if (a !== b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /**
   * Greater than check
   */
  hbs.registerHelper('gt', (a, b, options) => {
    if (a > b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /**
   * Less than check
   */
  hbs.registerHelper('lt', (a, b, options) => {
    if (a < b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /**
   * Status badge class
   */
  hbs.registerHelper('statusBadgeClass', (status) => {
    const classes = {
      'draft': 'bg-secondary',
      'submitted': 'bg-info',
      'opened': 'bg-primary',
      'evaluated': 'bg-warning',
      'won': 'bg-success',
      'rejected': 'bg-danger',
      'issued': 'bg-info',
      'accepted': 'bg-success',
      'finalized': 'bg-success',
      'contested': 'bg-warning',
      'signed': 'bg-success',
      'active': 'bg-success',
      'completed': 'bg-success',
      'terminated': 'bg-danger',
      'pending': 'bg-secondary',
      'approved': 'bg-success',
      'rejected': 'bg-danger',
      'success': 'bg-success',
      'failure': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
  });

  /**
   * Substring
   */
  hbs.registerHelper('substr', (str, start, length) => {
    if (!str) return '';
    return str.substring(start, start + length);
  });

  /**
   * Add numbers
   */
  hbs.registerHelper('add', (a, b) => {
    return a + b;
  });

  /**
   * Subtract numbers
   */
  hbs.registerHelper('subtract', (a, b) => {
    return a - b;
  });

  /**
   * Multiply numbers
   */
  hbs.registerHelper('multiply', (a, b) => {
    return a * b;
  });

  /**
   * Divide numbers
   */
  hbs.registerHelper('divide', (a, b) => {
    if (b === 0) return 0;
    return (a / b).toFixed(2);
  });

  /**
   * JSON stringify
   */
  hbs.registerHelper('JSON', (value) => {
    return JSON.stringify(value, null, 2);
  });

  /**
   * Range helper
   */
  hbs.registerHelper('range', (start, end) => {
    const result = [];
    for (let i = start; i < end; i++) {
      result.push(i);
    }
    return result;
  });

  /**
   * Logical AND
   */
  hbs.registerHelper('and', (a, b, options) => {
    if (a && b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /**
   * Logical OR
   */
  hbs.registerHelper('or', (a, b, options) => {
    if (a || b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /**
   * Logical NOT
   */
  hbs.registerHelper('not', (value, options) => {
    if (!value) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /**
   * Array length
   */
  hbs.registerHelper('length', (array) => {
    return Array.isArray(array) ? array.length : 0;
  });

  /**
   * Join array
   */
  hbs.registerHelper('join', (array, separator) => {
    if (Array.isArray(array)) {
      return array.join(separator || ', ');
    }
    return '';
  });

  /**
   * Get array item
   */
  hbs.registerHelper('at', (array, index) => {
    return Array.isArray(array) ? array[index] : '';
  });

  /**
   * Capitalize string
   */
  hbs.registerHelper('capitalize', (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  /**
   * Time ago (e.g., "2 hours ago")
   */
  hbs.registerHelper('timeAgo', (date) => {
    if (!date) return '';
    return moment(date).fromNow();
  });
};

export default registerHelpers;
