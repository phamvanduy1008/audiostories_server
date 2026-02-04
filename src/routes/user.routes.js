import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/schema.js";

const router = express.Router();

// POST /api/users/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already in use" });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = new User({ username, email, password: hash });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret", { expiresIn: "30d" });

    res.status(201).json({ id: user._id, username: user.username, email: user.email, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (password !== user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "30d" }
    );

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Không có token, truy cập bị từ chối" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// ────────────────────────────────────────────────
// GET /api/users/me    ← thông tin user hiện tại
// ────────────────────────────────────────────────
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "username email avatar role status createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const response = {
      id: user._id,
      username: user.username || "Người dùng",
      email: user.email,
      avatar: user.avatar || null,         
      role: user.role,
      joinDate: user.createdAt
        ? new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(user.createdAt)
        : "Không xác định",

        stats: {
        listenedStories: 0,          // chưa có collection history → để 0
        totalListeningTime: "0 Giờ", // chưa track thời gian nghe
        favoriteStories: 0           // chưa có favorite
      }
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

export default router;
