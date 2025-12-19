/**
 * Admin User Management Controller
 * Handles user management operations
 */

const User = require('../../models/User.model');
const { logAdminAction, getIpAddress, getUserAgent } = require('../../utils/adminLogger');

// -------------------------------------------
// @desc    Get all users with pagination and filters (Admin)
// @route   GET /api/admin/users
// @access  Private (Admin only)
// -------------------------------------------
exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      role,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // Search filter (username, email)
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter
    if (status && status !== 'All') {
      query.status = status;
    }

    // Role filter
    if (role) {
      query.role = role;
    }

    // Date range filter (registration date)
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const users = await User.find(query)
      .select('-password -__v -refreshToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------
// @desc    Update user status (Admin)
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin only)
// -------------------------------------------
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.params.id;
    const adminId = req.user.id;

    if (!['active', 'blocked', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'update_user_status',
      targetType: 'user',
      targetId: userId,
      description: `Updated user status from ${oldStatus} to ${status}`,
      before: { status: oldStatus },
      after: { status },
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.json({ message: 'User status updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------
// @desc    Bulk update user status (Admin)
// @route   PUT /api/admin/users/bulk-status
// @access  Private (Admin only)
// -------------------------------------------
exports.bulkUpdateUserStatus = async (req, res) => {
  try {
    const { userIds, status } = req.body;
    const adminId = req.user.id;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }

    if (!['active', 'blocked', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Update all users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { status } }
    );

    // Log admin action
    await logAdminAction({
      adminId,
      action: 'bulk_update_user_status',
      targetType: 'user',
      targetId: null,
      description: `Bulk updated ${result.modifiedCount} users to status: ${status}`,
      metadata: { userIds, status, count: result.modifiedCount },
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.json({
      message: `Successfully updated ${result.modifiedCount} users`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -------------------------------------------
// @desc    Export users to CSV (Admin)
// @route   GET /api/admin/users/export
// @access  Private (Admin only)
// -------------------------------------------
exports.exportUsers = async (req, res) => {
  try {
    const {
      search,
      status,
      role,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // Apply same filters as getUsers
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (role) {
      query.role = role;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Get all users matching the query (no pagination for export)
    const users = await User.find(query)
      .select('-password -__v -refreshToken')
      .sort({ createdAt: -1 });

    // Convert to CSV format
    const csvRows = [];
    
    // CSV Header
    csvRows.push([
      'Username',
      'Email',
      'First Name',
      'Last Name',
      'Status',
      'Role',
      'Balance',
      'Registration Date',
      'Last Login',
      'KYC Status',
    ].join(','));

    // CSV Data
    users.forEach(user => {
      csvRows.push([
        user.username || '',
        user.email || '',
        user.firstName || '',
        user.lastName || '',
        user.status || '',
        user.role || '',
        user.balance || 0,
        user.createdAt ? user.createdAt.toISOString() : '',
        user.lastLogin ? user.lastLogin.toISOString() : '',
        user.kycStatus || 'pending',
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
    });

    const csvContent = csvRows.join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

