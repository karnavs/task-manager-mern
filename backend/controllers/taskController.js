const mongoose = require("mongoose");
const Task = require("../models/Task");

const VALID_STATUSES = ["pending", "in-progress", "completed"];
const VALID_PRIORITIES = ["low", "medium", "high"];

// GET /api/tasks
// Get only the authenticated user's tasks.
async function getTasks(req, res, next) {
  try {
    const {
      search = "",
      status = "",
      priority = "",
      sort = "newest",
    } = req.query;

    const filter = {
      user: req.user._id,
    };

    // Validate status filters.
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status filter.",
        });
      }

      filter.status = status;
    }

    // Validate priority filters.
    if (priority) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid priority filter.",
        });
      }

      filter.priority = priority;
    }

    // Search task titles and descriptions.
    if (search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
      ];
    }

    // Sort the results.
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      dueDate: { dueDate: 1, createdAt: -1 },
    };

    if (!sortOptions[sort]) {
      return res.status(400).json({
        success: false,
        message: "Invalid sort option.",
      });
    }

    const tasks = await Task.find(filter).sort(sortOptions[sort]);

    return res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/tasks/:id
// Get a specific task only if the authenticated user owns it.
async function getTaskById(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/tasks
// Create a task owned by the authenticated user.
async function createTask(req, res, next) {
  try {
    const {
      title,
      description = "",
      status = "pending",
      priority = "medium",
      dueDate = null,
    } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "A non-empty task title is required.",
      });
    }

    if (title.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Task title cannot exceed 150 characters.",
      });
    }

    if (
      typeof description !== "string" ||
      description.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be text and cannot exceed 2000 characters.",
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task status.",
      });
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task priority.",
      });
    }

    let parsedDueDate = null;

    if (dueDate !== null && dueDate !== "") {
      parsedDueDate = new Date(dueDate);

      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date.",
        });
      }
    }

    // Never accept the owner ID from the client.
    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: parsedDueDate,
      user: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
      task,
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/tasks/:id
// Update only a task belonging to the authenticated user.
async function updateTask(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "dueDate",
    ];

    const updates = Object.keys(req.body);

    if (
      updates.length === 0 ||
      updates.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide valid task fields to update.",
      });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    // Validate fields before assigning them.
    if (updates.includes("title")) {
      if (
        typeof req.body.title !== "string" ||
        !req.body.title.trim() ||
        req.body.title.trim().length > 150
      ) {
        return res.status(400).json({
          success: false,
          message: "Title must contain between 1 and 150 characters.",
        });
      }

      task.title = req.body.title.trim();
    }

    if (updates.includes("description")) {
      if (
        typeof req.body.description !== "string" ||
        req.body.description.length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message: "Description must be text and cannot exceed 2000 characters.",
        });
      }

      task.description = req.body.description.trim();
    }

    if (updates.includes("status")) {
      if (!VALID_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task status.",
        });
      }

      task.status = req.body.status;
    }

    if (updates.includes("priority")) {
      if (!VALID_PRIORITIES.includes(req.body.priority)) {
        return res.status(400).json({
          success: false,
          message: "Invalid task priority.",
        });
      }

      task.priority = req.body.priority;
    }

    if (updates.includes("dueDate")) {
      if (req.body.dueDate === null || req.body.dueDate === "") {
        task.dueDate = null;
      } else {
        const parsedDueDate = new Date(req.body.dueDate);

        if (Number.isNaN(parsedDueDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid due date.",
          });
        }

        task.dueDate = parsedDueDate;
      }
    }

    await task.save();

    return res.status(200).json({
      success: true,
      message: "Task updated successfully.",
      task,
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/tasks/:id
// Delete only a task belonging to the authenticated user.
async function deleteTask(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID.",
      });
    }

    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};