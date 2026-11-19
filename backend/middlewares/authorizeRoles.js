const ErrorHandler = require('../utils/errorHandler');

exports.authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ErrorHandler(`Role '${req.user?.role || 'unknown'}' is not authorized to access this resource`, 403));
  }
  next();
};
