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
          canViewBilling: user.canViewBilling,
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
          canViewBilling: user.canViewBilling,
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
      data: { 
        user: {
          ...user,
          canViewBilling: user.canViewBilling,
          profilePhoto: user.profilePhoto,
        }
      },
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
    const { name, email, phone } = req.body;
    const userId = req.user.id;

    // Validate phone uniqueness if provided
    if (phone) {
      const existingPhone = await User.findByPhone(phone);
      if (existingPhone && existingPhone.id !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already in use by another account',
        });
      }
    }

    // Validate email uniqueness if provided
    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already in use by another account',
        });
      }
    }

    const user = await User.update(userId, { name, email, phone });

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

const updateProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo provided',
      });
    }

    // Determine the URL path for the uploaded photo
    const profilePhoto = `/uploads/${req.file.filename}`;

    const user = await User.update(userId, { profilePhoto });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Profile photo updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile photo',
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

const requestDelete = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.requestDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Delete request submitted successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Request delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting delete request',
      error: error.message,
    });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  updateProfile,
  updateProfilePhoto,
  changePassword,
  updatePushToken,
  requestDelete,
};
