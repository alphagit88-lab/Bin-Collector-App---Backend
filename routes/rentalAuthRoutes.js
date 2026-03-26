const express = require("express");
const router = express.Router();

const { signup, login, getMe } = require("../controllers/rentalAuthController");

const {
  validateRentalSignup,
  validateRentalLogin,
} = require("../middleware/rentalValidation");

const { authenticate } = require("../middleware/authMiddleware");

router.post("/signup", validateRentalSignup, signup);
router.post("/login", validateRentalLogin, login);
router.get("/me", authenticate, getMe);

module.exports = router;
