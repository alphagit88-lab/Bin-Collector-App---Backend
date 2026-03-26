const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  getMe,
  updateProfile,
} = require("../controllers/rentalAuthController");

const {
  validateRentalSignup,
  validateRentalLogin,
  validateRentalProfileUpdate,
} = require("../middleware/rentalValidation");

const { authenticate } = require("../middleware/authMiddleware");

router.post("/signup", validateRentalSignup, signup);
router.post("/login", validateRentalLogin, login);
router.get("/me", authenticate, getMe);
router.put(
  "/profile",
  authenticate,
  validateRentalProfileUpdate,
  updateProfile,
);

module.exports = router;
