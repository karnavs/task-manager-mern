const { body } = require("express-validator");

const validateCreateTask = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Task title is required")
    .bail()
    .isLength({ max: 100 })
    .withMessage("Task title cannot exceed 100 characters"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be text")
    .bail()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("status")
    .optional()
    .isIn(["pending", "in-progress", "completed"])
    .withMessage("Status must be pending, in-progress, or completed"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),
];

const validateUpdateTask = [
  body("title")
    .optional()
    .isString()
    .withMessage("Task title must be text")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Task title cannot be empty")
    .bail()
    .isLength({ max: 100 })
    .withMessage("Task title cannot exceed 100 characters"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be text")
    .bail()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("status")
    .optional()
    .isIn(["pending", "in-progress", "completed"])
    .withMessage("Status must be pending, in-progress, or completed"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be low, medium, or high"),
];

module.exports = {
  validateCreateTask,
  validateUpdateTask,
};