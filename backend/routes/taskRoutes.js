const express = require("express");
const { handleValidationErrors } = require("../middleware/validationMiddleware");

const {
  validateCreateTask,
  validateUpdateTask,
} = require("../validators/taskValidators");

const { protect } = require("../middleware/authMiddleware");

const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

// Every task endpoint requires authentication.
router.use(protect);

// GET /api/tasks
router.get("/", getTasks);

// GET /api/tasks/:id
router.get("/:id", getTaskById);

// POST /api/tasks
router.post("/", createTask);

// PUT /api/tasks/:id
router.put("/:id", updateTask);

// DELETE /api/tasks/:id
router.delete("/:id", deleteTask);

module.exports = router;