const { body, validationResult } = require('express-validator');

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
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Invalid phone number format'),
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

module.exports = {
  validateSignup,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateCreatePassword,
  handleValidationErrors,
  passwordValidator,
};
