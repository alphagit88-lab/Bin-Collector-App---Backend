const { body, validationResult } = require('express-validator');

const CANADIAN_PHONE_PATTERN = /^\+1[2-9]\d{2}[2-9]\d{6}$/;
const CANADIAN_PHONE_MESSAGE = 'Enter +1 followed by 10 numbers, without spaces or dashes.';

const canadianPhoneValidator = (field, { optional = false } = {}) => {
  let validator = body(field);
  if (optional) {
    validator = validator.optional({ values: 'falsy' });
  }
  return validator
    .notEmpty().withMessage('Phone number is required')
    .matches(CANADIAN_PHONE_PATTERN).withMessage(CANADIAN_PHONE_MESSAGE);
};

const passwordValidator = (field) =>
  body(field)
    .customSanitizer((value) => typeof value === 'string' ? value.trim() : value)
    .notEmpty().withMessage('Password cannot be empty or contain only spaces')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must include an uppercase letter')
    .matches(/\d/).withMessage('Password must include a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must include a special character');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

const validateSignup = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  canadianPhoneValidator('phone'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['customer', 'supplier']).withMessage('Invalid role. Only customer or supplier can sign up.'),
  body('supplierType')
    .if(body('role').equals('supplier'))
    .notEmpty().withMessage('Supplier type is required')
    .isIn(['commercial', 'residential', 'commercial_residential']).withMessage('Invalid supplier type'),
  passwordValidator('password'),
  handleValidationErrors,
];

const validateLogin = [
  body('phone')
    .optional()
    .trim(),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format'),
  body()
    .custom((_, { req }) => {
      if (!req.body.phone && !req.body.email) {
        throw new Error('Email or phone number is required');
      }
      return true;
    }),
  body('password')
    .customSanitizer((value) => typeof value === 'string' ? value.trim() : value)
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];



const validateUpdateProfile = [
  canadianPhoneValidator('phone', { optional: true }),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  handleValidationErrors,
];

const validateChangePassword = [
  body('currentPassword')
    .customSanitizer((value) => typeof value === 'string' ? value.trim() : value)
    .notEmpty().withMessage('Current password is required'),
  passwordValidator('newPassword'),
  handleValidationErrors,
];

const validateCreatePassword = [
  passwordValidator('password'),
  handleValidationErrors,
];

const validateCreateUser = [
  canadianPhoneValidator('phone'),
  passwordValidator('password'),
  handleValidationErrors,
];

const validateCreateBooking = [
  canadianPhoneValidator('contact_number'),
  handleValidationErrors,
];

const validateUpdateBooking = [
  canadianPhoneValidator('contact_number', { optional: true }),
  handleValidationErrors,
];

const validateSupplierCreateBooking = [
  canadianPhoneValidator('customer_phone'),
  handleValidationErrors,
];

const validateForgotPasswordRequest = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email or phone number is required')
    .isLength({ max: 254 }).withMessage('Email or phone number is too long'),
  handleValidationErrors,
];

const validateForgotPasswordReset = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email or phone number is required')
    .isLength({ max: 254 }).withMessage('Email or phone number is too long'),
  body('otp')
    .trim()
    .matches(/^\d{6}$/).withMessage('OTP must contain exactly 6 numbers'),
  passwordValidator('newPassword'),
  handleValidationErrors,
];

const validateAddCustomer = [
  body('name')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be between 2 and 100 characters'),
  canadianPhoneValidator('phone'),
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail().withMessage('Invalid email format'),
  handleValidationErrors,
];

module.exports = {
  validateSignup,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateCreatePassword,
  validateCreateUser,
  validateCreateBooking,
  validateUpdateBooking,
  validateSupplierCreateBooking,
  validateForgotPasswordRequest,
  validateForgotPasswordReset,
  validateAddCustomer,
  handleValidationErrors,
  passwordValidator,
  canadianPhoneValidator,
};
