import express from "express";
import { History, Story } from "../models/schema.js";

const router = express.Router();

// POST /api/history - Lưu hoặc update lịch sử nghe
router.post("/", async (req, res) => {
  try {
    const { userId, storyId, chapterId, lastPosition, duration, progressPercent, isCompleted } = req.body;

    if (!userId || !storyId || !chapterId) {
      return res.status(400).json({ message: "userId, storyId và chapterId là bắt buộc" });
    }

    if (progressPercent !== undefined && (progressPercent < 0 || progressPercent > 100)) {
      return res.status(400).json({ message: "progressPercent phải từ 0 đến 100" });
    }
    if (lastPosition !== undefined && lastPosition < 0) {
      return res.status(400).json({ message: "lastPosition không được âm" });
    }

    const storyExists = await Story.findById(storyId);
    if (!storyExists) {
      return res.status(404).json({ message: "Truyện không tồn tại" });
    }

    const update = {
      userId,
      storyId,
      chapterId,
      lastPosition: Math.floor(lastPosition || 0),
      duration: duration ? Math.floor(duration) : undefined,
      progressPercent: progressPercent !== undefined ? Math.round(progressPercent) : undefined,
      isCompleted: isCompleted !== undefined ? isCompleted : false,
      updatedAt: new Date(),
    };

    const history = await History.findOneAndUpdate(
      { userId, storyId, chapterId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(history);
  } catch (err) {
    console.error("Lỗi lưu history:", err);
    res.status(500).json({ message: "Lỗi server khi lưu lịch sử", error: err.message });
  }
});

// GET /api/history/user/:userId - Lấy danh sách lịch sử
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
        select: "title order duration audioUrl"  // ĐÃ THÊM audioUrl
      })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(histories);
  } catch (err) {
    console.error("Lỗi lấy history:", err);
    res.status(500).json({ message: "Lỗi server khi lấy lịch sử", error: err.message });
  }
});

export default router;