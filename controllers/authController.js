const User = require('../models/User');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const pool = require('../config/database');
const crypto = require('crypto');
const { sendEmailConflict } = require('../utils/emailConflict');

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_SECONDS = 30;
const OTP_LIMIT_WINDOW_HOURS = 1;
const MAX_OTP_SENDS = 5;
const MAX_OTP_VERIFY_ATTEMPTS = 5;

const hashResetOtp = (userId, otp) => crypto
  .createHmac('sha256', process.env.OTP_SECRET || jwtConfig.secret)
  .update(`${userId}:${otp}`)
  .digest('hex');

const maskDestination = (destination) => {
  const value = String(destination || '');
  if (value.length <= 5) return `${value.slice(0, 1)}***${value.slice(-1)}`;
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(4, value.length - 5))}${value.slice(-3)}`;
};

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

    await User.assertEmailAvailable(email);

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
    if (sendEmailConflict(res, error)) return;
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
    const { email, phone, password } = req.body;

    // Find user by phone or email
    const user = (await User.findByPhone(email || phone)) || (await User.findByEmail(email || phone));
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email, phone number, or password',
      });
    }

    // Verify password
    const isPasswordValid = await User.verifyPassword(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email, phone number, or password',
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

const requestPasswordResetOtp = async (req, res) => {
  const client = await pool.connect();
  try {
    const identifier = req.body.identifier.trim();
    const user = (await User.findByPhone(identifier)) || (await User.findByEmail(identifier));

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account was found with that email or phone number' });
    }
    if (!user.email) {
      return res.status(400).json({
        success: false,
        message: 'This account has no email address available for password recovery. Please contact support.',
      });
    }

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [user.id]);
    const existingResult = await client.query(
      'SELECT * FROM password_reset_otps WHERE user_id = $1 FOR UPDATE',
      [user.id]
    );
    const existing = existingResult.rows[0];
    const now = Date.now();

    if (existing) {
      const elapsedSeconds = Math.floor((now - new Date(existing.last_sent_at).getTime()) / 1000);
      if (elapsedSeconds < OTP_RESEND_SECONDS) {
        await client.query('ROLLBACK');
        return res.status(429).json({
          success: false,
          message: `Please wait ${OTP_RESEND_SECONDS - elapsedSeconds} seconds before requesting another OTP`,
          data: { retryAfterSeconds: OTP_RESEND_SECONDS - elapsedSeconds },
        });
      }

      const windowAge = now - new Date(existing.window_started_at).getTime();
      if (windowAge < OTP_LIMIT_WINDOW_HOURS * 60 * 60 * 1000 && existing.send_count >= MAX_OTP_SENDS) {
        await client.query('ROLLBACK');
        return res.status(429).json({
          success: false,
          message: 'Maximum of 5 OTP requests reached. Please try again after one hour or contact support.',
        });
      }
    }

    const resetWindow = !existing || now - new Date(existing.window_started_at).getTime() >= OTP_LIMIT_WINDOW_HOURS * 60 * 60 * 1000;
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashResetOtp(user.id, otp);
    await client.query(
      `INSERT INTO password_reset_otps
         (user_id, otp_hash, expires_at, last_sent_at, window_started_at, send_count, verify_attempts, updated_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes', NOW(), NOW(), 1, 0, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         otp_hash = EXCLUDED.otp_hash,
         expires_at = EXCLUDED.expires_at,
         last_sent_at = NOW(),
         window_started_at = CASE WHEN $3 THEN NOW() ELSE password_reset_otps.window_started_at END,
         send_count = CASE WHEN $3 THEN 1 ELSE password_reset_otps.send_count + 1 END,
         verify_attempts = 0,
         updated_at = NOW()`,
      [user.id, otpHash, resetWindow]
    );
    await client.query('COMMIT');

    // Temporary delivery mechanism until email service is configured. Never return the OTP to clients.
    console.log(`[Password reset OTP] user=${user.id} destination=${user.email} otp=${otp} expires=${OTP_EXPIRY_MINUTES}m`);

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        maskedDestination: maskDestination(user.email),
        retryAfterSeconds: OTP_RESEND_SECONDS,
        expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Request password reset OTP error:', error);
    return res.status(500).json({ success: false, message: 'Unable to request password reset OTP' });
  } finally {
    client.release();
  }
};

const resetForgottenPassword = async (req, res) => {
  const client = await pool.connect();
  try {
    const { otp, newPassword } = req.body;
    const identifier = req.body.identifier.trim();
    const user = (await User.findByPhone(identifier)) || (await User.findByEmail(identifier));
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [user.id]);
    const result = await client.query(
      'SELECT * FROM password_reset_otps WHERE user_id = $1 FOR UPDATE',
      [user.id]
    );
    const record = result.rows[0];

    if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
      if (record) await client.query('DELETE FROM password_reset_otps WHERE user_id = $1', [user.id]);
      await client.query('COMMIT');
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    if (record.verify_attempts >= MAX_OTP_VERIFY_ATTEMPTS) {
      await client.query('ROLLBACK');
      return res.status(429).json({ success: false, message: 'Too many incorrect OTP attempts. Request a new OTP.' });
    }

    const suppliedHash = Buffer.from(hashResetOtp(user.id, otp), 'hex');
    const expectedHash = Buffer.from(record.otp_hash, 'hex');
    const otpIsValid = suppliedHash.length === expectedHash.length && crypto.timingSafeEqual(suppliedHash, expectedHash);
    if (!otpIsValid) {
      await client.query(
        'UPDATE password_reset_otps SET verify_attempts = verify_attempts + 1, updated_at = NOW() WHERE user_id = $1',
        [user.id]
      );
      await client.query('COMMIT');
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await User.hashPassword(newPassword);
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = FALSE',
      [hashedPassword, user.id]
    );
    await client.query('DELETE FROM password_reset_otps WHERE user_id = $1', [user.id]);
    await client.query('COMMIT');

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Reset forgotten password error:', error);
    return res.status(500).json({ success: false, message: 'Unable to reset password' });
  } finally {
    client.release();
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

    await User.assertEmailAvailable(email, userId);

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
    if (sendEmailConflict(res, error)) return;
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
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findByIdForAuthentication(userId);
    if (!user || !(await User.verifyPassword(user, currentPassword))) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

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
  requestPasswordResetOtp,
  resetForgottenPassword,
};
