const { User, Admin } = require('../models');

const superAdminAuth = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has super_admin role
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Super admin access required'
      });
    }

    // Verify admin profile exists and is active
    const adminProfile = await Admin.findOne({
      user_id: req.user._id,
      admin_type: 'super_admin',
      is_active: true
    });

    if (!adminProfile) {
      return res.status(403).json({
        success: false,
        error: 'Super admin profile not found or inactive'
      });
    }

    // Add admin profile to request
    req.adminProfile = adminProfile;
    next();
  } catch (error) {
    console.error('Super admin auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authorization'
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has admin or super_admin role
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Verify admin profile exists and is active
    const adminProfile = await Admin.findOne({
      user_id: req.user._id,
      is_active: true
    });

    if (!adminProfile) {
      return res.status(403).json({
        success: false,
        error: 'Admin profile not found or inactive'
      });
    }

    // Add admin profile to request
    req.adminProfile = adminProfile;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authorization'
    });
  }
};

module.exports = {
  superAdminAuth,
  adminAuth
};
