const { body, validationResult } = require('express-validator');

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
  handleValidationErrors,
];

const validateLogin = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

module.exports = {
  validateSignup,
  validateLogin,
  handleValidationErrors,
};
