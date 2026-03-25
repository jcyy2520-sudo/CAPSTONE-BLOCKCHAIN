/**
 * Authorization middleware functions
 */

export const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error_msg', 'You must be logged in to access this page');
  return res.redirect('/login');
};

export const ensureAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Administrator access required');
  return res.redirect('/login');
};

export const ensureBidder = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'bidder') {
    return next();
  }
  req.flash('error_msg', 'You must be logged in as a bidder to access this page');
  return res.redirect('/login');
};

export const ensureApprovedBidder = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'bidder') {
    // Further checks for approval status can be added here
    return next();
  }
  req.flash('error_msg', 'Your bidder account must be approved to access this page');
  return res.redirect('/login');
};

export const ensureRole = (roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error_msg', 'You must be logged in');
      return res.redirect('/login');
    }

    const roleArray = Array.isArray(roles) ? roles : [roles];
    if (roleArray.includes(req.session.user.role)) {
      return next();
    }

    req.flash('error_msg', 'You do not have permission to access this page');
    return res.redirect('/login');
  };
};

export const ensureAuditor = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'auditor') {
    return next();
  }
  req.flash('error_msg', 'Auditor access required');
  return res.redirect('/login');
};
