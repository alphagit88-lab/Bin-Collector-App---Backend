const User = require('../models/User');

// Create admin user (only existing admins can do this)
const createAdmin = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Check if user with phone already exists
    const existingUser = await User.findByPhone(phone);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }

    // Create admin user
    const user = await User.create({ 
      name, 
      phone, 
      email, 
      role: 'admin', 
      password 
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin',
      error: error.message,
    });
  }
};

// Create user (admin, customer, or supplier)
const createUser = async (req, res) => {
  try {
    const { name, phone, email, role, password } = req.body;

    if (!['admin', 'customer', 'supplier'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be admin, customer, or supplier',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Check if user with phone already exists
    const existingUser = await User.findByPhone(phone);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }

    // Create user
    const user = await User.create({ 
      name, 
      phone, 
      email, 
      role, 
      password 
    });

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      data: { user },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message,
    });
  }
};

// Get all admins
const getAllAdmins = async (req, res) => {
  try {
    const users = await User.findAll();
    const admins = users.filter(user => user.role === 'admin');
    
    res.json({
      success: true,
      data: { admins },
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admins',
      error: error.message,
    });
  }
};

// Get users by role
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['customer', 'supplier'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be customer or supplier',
      });
    }

    const users = await User.findAll();
    const filteredUsers = users.filter(user => user.role === role);
    
    res.json({
      success: true,
      data: { users: filteredUsers },
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

// Update admin
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    // Verify user is admin
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is not an admin',
      });
    }

    // Prevent updating yourself to non-admin
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot modify your own admin status',
      });
    }

    const updatedUser = await User.update(id, { name, email });
    
    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admin',
      error: error.message,
    });
  }
};

// Update user (any role)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const updatedUser = await User.update(id, { name, email });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
    });
  }
};

// Delete admin
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    // Verify user is admin
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'User is not an admin',
      });
    }

    await User.delete(id);
    
    res.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting admin',
      error: error.message,
    });
  }
};

// Delete user (any role)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await User.delete(id);
    
    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message,
    });
  }
};

module.exports = {
  createAdmin,
  createUser,
  getAllAdmins,
  getUsersByRole,
  updateAdmin,
  updateUser,
  deleteAdmin,
  deleteUser,
};
