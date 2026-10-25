require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const avatarRoutes = require("./routes/avatarRoutes");

const {
  notFound,
  errorHandler,
} = require("./middleware/errorMiddleware");

const app = express();

// Validate the JWT secret before starting.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET is missing or too short. Use a random secret of at least 32 characters."
  );
}

// Allow requests from the frontend.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

// Parse incoming JSON request bodies.
app.use(express.json("/uploads", express.static("uploads")));
// Serve uploaded profile pictures.
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// Health-check endpoint.
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Task Manager API is running",
  });
});

// Authentication endpoints.
app.use("/api/auth", authRoutes);

// Task management endpoints.
app.use("/api/tasks", taskRoutes);

// Profile picture upload endpoint.
app.use("/api/avatar", avatarRoutes);

// Handle unknown routes.
app.use(notFound);

// Handle errors.
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Task Manager API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error.message);
    process.exit(1);
  }
}

startServer();