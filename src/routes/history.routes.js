import express from "express";
import { History, Story } from "../models/schema.js";

const router = express.Router();

// POST /api/history - Lưu hoặc update (bắt buộc chapterId)
router.post("/", async (req, res) => {
  try {
    const { userId, storyId, chapterId, lastPosition, duration, progressPercent, isCompleted } = req.body;

    if (!userId || !storyId || !chapterId) {
      return res.status(400).json({ message: "userId, storyId và chapterId là bắt buộc" });
    }

    // Validate
    if (progressPercent !== undefined && (progressPercent < 0 || progressPercent > 100)) {
      return res.status(400).json({ message: "progressPercent phải từ 0 đến 100" });
    }
    if (lastPosition !== undefined && lastPosition < 0) {
      return res.status(400).json({ message: "lastPosition không được âm" });
    }

    await Story.findById(storyId); // Kiểm tra story tồn tại

    const update = {
      lastPosition: Math.floor(lastPosition || 0),
      duration: duration ? Math.floor(duration) : undefined,
      progressPercent: progressPercent !== undefined ? Math.round(progressPercent) : undefined,
      isCompleted: isCompleted !== undefined ? isCompleted : false,
    };

    const history = await History.findOneAndUpdate(
      { userId, storyId, chapterId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(history);
  } catch (err) {
    console.error("Lỗi lưu history:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// Nếu cần GET danh sách lịch sử user (cho màn History)
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const histories = await History.find({ userId })
      .populate({
        path: "storyId",
        select: "title slug coverImage author category description"
      })
      .populate({
        path: "chapterId",
        select: "title order duration"
      })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(histories);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

export default router;