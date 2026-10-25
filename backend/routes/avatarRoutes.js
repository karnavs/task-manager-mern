const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

// Upload or replace the authenticated user's profile picture.
router.post("/", protect, upload.single("avatar"), async (req, res, next) => {
  let newFilePath;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a profile picture.",
      });
    }

    newFilePath = req.file.path;

    const user = req.user;
    const previousAvatar = user.avatar;

    // Store a relative path rather than an absolute filesystem path.
    user.avatar = `uploads/${req.file.filename}`;

    await user.save();

    // Delete the previous picture after the database update succeeds.
    if (
      previousAvatar &&
      previousAvatar.startsWith("uploads/") &&
      path.basename(previousAvatar) === previousAvatar.slice("uploads/".length)
    ) {
      const oldFilePath = path.join(
        __dirname,
        "..",
        "uploads",
        path.basename(previousAvatar)
      );

      if (oldFilePath !== newFilePath) {
        await fs.unlink(oldFilePath).catch((error) => {
          if (error.code !== "ENOENT") {
            console.error("Could not delete previous avatar:", error.message);
          }
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture uploaded successfully.",
      avatar: `/${user.avatar.replace(/\\/g, "/")}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: `/${user.avatar.replace(/\\/g, "/")}`,
      },
    });
  } catch (error) {
    // Remove the newly uploaded file if saving the update fails.
    if (newFilePath) {
      await fs.unlink(newFilePath).catch(() => {});
    }

    next(error);
  }
});

module.exports = router;