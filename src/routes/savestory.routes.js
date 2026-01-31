import express from "express";
import { SavedStory, Story } from "../models/schema.js";

const router = express.Router();

// POST /api/savestories - save a story
// body: { userId, storyId }
router.post("/", async (req, res) => {
  try {
    const { userId, storyId } = req.body;

    if (!userId || !storyId) {
      return res.status(400).json({ message: "userId and storyId required" });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    const exists = await SavedStory.findOne({ userId, storyId });
    if (exists) {
      return res.status(409).json({ message: "Already saved", saved: exists });
    }
    try {
      const saved = await SavedStory.create({ userId, storyId });
      return res.status(201).json(saved);
    } catch (e) {
      if (e && e.code === 11000) {
        const saved = await SavedStory.findOne({ userId, storyId });
        return res.status(409).json({ message: "Already saved", saved });
      }
      throw e;
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/savestories/check?userId=...&storyId=... - check if saved
router.get("/check", async (req, res) => {
  try {
    const { userId, storyId } = req.query;
    if (!userId || !storyId) return res.status(400).json({ message: "userId and storyId required" });

    const exists = await SavedStory.findOne({ userId, storyId });
    res.json({ saved: !!exists, savedDoc: exists || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/savestories - unsave
// body: { userId, storyId }
router.delete("/", async (req, res) => {
  try {
    const { userId, storyId } = req.body;
    if (!userId || !storyId) return res.status(400).json({ message: "userId and storyId required" });

    const removed = await SavedStory.findOneAndDelete({ userId, storyId });
    if (!removed) return res.status(404).json({ message: "Saved story not found" });

    res.json({ message: "Removed", removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/savestories/user/:userId - list saved stories
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const list = await SavedStory.find({ userId }).populate({ path: "storyId", select: "title slug coverImage" });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
