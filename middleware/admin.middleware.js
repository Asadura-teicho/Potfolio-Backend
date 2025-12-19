const User = require('../models/User.model');

// Middleware to check if user is admin
const adminMiddleware = async (req, res, next) => {
  try {
    // Auth middleware should already attach req.user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const adminRoles = ['admin', 'super_admin', 'operator'];
    if (!adminRoles.includes(user.role)) {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    req.adminUser = user; // attach full admin object
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = adminMiddleware;
