const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAuth(req, res, next) {
  try {
    let token = null;

    // Check Authorization header: Bearer <token>, custom header, or query param
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers['x-admin-token']) {
      token = req.headers['x-admin-token'];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in to the admin portal.'
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.'
    });
  }
}

module.exports = {
  requireAuth
};
