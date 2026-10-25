const express = require("express");
const { handleValidationErrors } = require("../middleware/validationMiddleware");

const {
  validateRegistration,
  validateLogin,
} = require("../validators/authValidators");
const {
  registerUser,
  loginUser,
  getCurrentUser,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/auth/register
router.post("/register", registerUser);

// POST /api/auth/login
router.post("/login", loginUser);

// GET /api/auth/me — requires a valid JWT
router.get("/me", protect, getCurrentUser);

module.exports = router;