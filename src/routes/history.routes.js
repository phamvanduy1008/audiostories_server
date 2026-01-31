import express from "express";
import { History, Story, Chapter } from "../models/schema.js";


const router = express.Router();

// POST /api/history - create or update
// POST /api/history - create or update (lưu riêng theo chapter)
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

    await Story.findById(storyId); // kiểm tra truyện tồn tại

    const update = {
      lastPosition: Math.floor(lastPosition || 0),
      duration: duration ? Math.floor(duration) : undefined,
      progressPercent: progressPercent !== undefined ? Math.round(progressPercent) : undefined,
      isCompleted: isCompleted !== undefined ? isCompleted : false,
    };

    // Upsert theo {userId, storyId, chapterId} → lưu riêng từng chapter
    const history = await History.findOneAndUpdate(
      { userId, storyId, chapterId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});
// GET /api/history/check?userId=...&storyId=...
router.get("/check", async (req, res) => {
  try {
    const { userId, storyId } = req.query;
    if (!userId || !storyId) return res.status(400).json({ message: "userId và storyId bắt buộc" });

    const history = await History.findOne({ userId, storyId });
    res.json({ exists: !!history, history });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

// GET /api/history/user/:userId - danh sách lịch sử của user
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
      .sort({ updatedAt: -1 }) // mới nhất lên đầu
      .limit(50); // tăng limit nếu cần

    res.json(histories);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});
// DELETE /api/history - xóa một entry
router.delete("/", async (req, res) => {
  try {
    const { userId, storyId } = req.body;
    if (!userId || !storyId) return res.status(400).json({ message: "userId và storyId bắt buộc" });

    const deleted = await History.findOneAndDelete({ userId, storyId });
    if (!deleted) return res.status(404).json({ message: "Không tìm thấy lịch sử" });

    res.json({ message: "Đã xóa lịch sử nghe", deleted });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});


router.post("/", async (req, res) => {
  try {
    const { userId, storyId, chapterId, lastPosition, duration, progressPercent, isCompleted } = req.body;

    if (!userId || !storyId) {
      return res.status(400).json({ message: "userId và storyId là bắt buộc" });
    }

    // Validate nhẹ
    if (progressPercent !== undefined && (progressPercent < 0 || progressPercent > 100)) {
      return res.status(400).json({ message: "progressPercent phải từ 0-100" });
    }
    if (lastPosition !== undefined && lastPosition < 0) {
      return res.status(400).json({ message: "lastPosition không được âm" });
    }

    await Story.findById(storyId); 

    const update = {
      ...(chapterId ? { chapterId } : {}),
      ...(lastPosition !== undefined ? { lastPosition } : {}),
      ...(duration !== undefined ? { duration } : {}),
      ...(progressPercent !== undefined ? { progressPercent } : {}),
      ...(isCompleted !== undefined ? { isCompleted } : {}),
    };

    const history = await History.findOneAndUpdate(
      { userId, storyId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(history);
  } catch (err) {
    console.error("Lỗi lưu history:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

export default router;