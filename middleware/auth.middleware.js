
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

const authMiddleware = async (req, res, next) => {
  try {
    // 1️⃣ Get token from httpOnly cookie
    let token = req.cookies?.accessToken;

    // Optional fallback to Authorization header
    if (!token) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: 'No access token found' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }

    // 2️⃣ Fetch user from DB
    const user = await User.findById(decoded.id).select('-password -__v');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.status === 'banned') return res.status(403).json({ message: 'Account banned' });
    if (user.status === 'self_excluded') return res.status(403).json({ message: 'Self exclusion active' });

    // 3️⃣ Attach user to request
    req.user = user;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = authMiddleware;
