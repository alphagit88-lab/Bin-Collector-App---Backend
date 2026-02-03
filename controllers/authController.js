const User = require('../models/User');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const signup = async (req, res) => {
  try {
    const { name, phone, email, role, password, supplierType } = req.body;

    // Prevent admin signup through public endpoint
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts can only be created by existing administrators',
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
    const user = await User.create({ name, phone, email, role, password, supplierType });

    // Generate token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          supplierType: user.supplierType,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find user by phone
    const user = await User.findByPhone(phone);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password',
      });
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password',
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;

    const user = await User.update(userId, { email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    // TODO: In a real app, we should verify the old password first if provided
    // For this implementation, we just update to the new password

    // Hash new password
    const hashedPassword = await User.hashPassword(newPassword);

    // Update password in DB
    await User.updatePassword(userId, hashedPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message,
    });
  }
};

const updatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
    }

    const user = await User.updatePushToken(userId, pushToken);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Push token updated successfully',
    });
  } catch (error) {
    console.error('Update push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating push token',
      error: error.message,
    });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  updateProfile,
  changePassword,
  updatePushToken,
};
