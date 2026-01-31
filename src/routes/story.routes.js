import express from "express";
import { Chapter, Story } from "../models/schema.js";


const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const stories = await Story.find()
      .populate("authorId", "username")
      .populate("categoryId", "name");

    const formatted = stories.map(s => ({
      id: s._id,
      slug: s.slug, 
      title: s.title,
      author: s.authorId?.username || "Unknown",
      category: s.categoryId?.name || "Audio",
      imageUrl: s.coverImage,
      description: s.description,
      tags: s.tags || [],
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/id/:id", async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate("authorId", "username")
      .populate("categoryId", "name");

    if (!story) {
      return res.status(404).json({ message: "Not found" });
    }

    const chapters = await Chapter.find({ storyId: story._id }).sort("order");

    // chỉ fetch nếu có chapter chưa có duration
    const needFetch = chapters.some(c => !c.duration);

    let durationMap = {};

    if (needFetch) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const metaRes = await fetch(
          `https://archive.org/metadata/${story.slug}`,
          { signal: controller.signal }
        );

        clearTimeout(timeout);

        if (metaRes.ok) {
          const meta = await metaRes.json();

          if (Array.isArray(meta.files)) {
            for (const f of meta.files) {
              if (f.name?.endsWith(".m4a") && f.length) {
                durationMap[f.name] = f.length;
              }
            }
          }

          // bulk update DB (nhẹ hơn save từng cái)
          const bulkOps = chapters
            .filter(c => !c.duration && durationMap[c.name])
            .map(c => ({
              updateOne: {
                filter: { _id: c._id },
                update: { $set: { duration: durationMap[c.name] } }
              }
            }));

          if (bulkOps.length) {
            await Chapter.bulkWrite(bulkOps);
            console.log(`✅ Saved duration for ${bulkOps.length} chapters`);
          }
        }
      } catch (e) {
        console.warn("⚠️ Archive fetch skipped:", e.name || e.message);
        // KHÔNG fail request
      }
    }

    res.json({
      id: story._id,
      slug: story.slug,
      title: story.title,
      author: story.authorId?.username,
      category: story.categoryId?.name,
      imageUrl: story.coverImage,
      description: story.description,
      tags: story.tags,
      chapters: chapters.map(c => ({
        id: c._id,
        number: String(c.order).padStart(2, "0"),
        title: c.title,
        subtitle: `Chương ${c.order}`,
        duration: c.duration || durationMap[c.name] || "--:--",
        icon: "music_note",
        audioUrl: `https://archive.org/download/${story.slug}/${c.name}`
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// 🔎 Search endpoint
router.get("/search", async (req, res) => {
  try {
    const { q = "", page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit) || 20));

    // escape special regex chars in query
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapeRegex(q.trim()), "i");

    const filter = q ? { $or: [ { title: regex }, { description: regex }, { tags: { $in: [regex] } } ] } : {};

    const total = await Story.countDocuments(filter);

    const stories = await Story.find(filter)
      .populate("authorId", "username")
      .populate("categoryId", "name")
      .skip((pageNum - 1) * lim)
      .limit(lim);

    const formatted = stories.map(s => ({
      id: s._id,
      slug: s.slug,
      title: s.title,
      author: s.authorId?.username || "Unknown",
      category: s.categoryId?.name || "Audio",
      imageUrl: s.coverImage,
      description: s.description,
      tags: s.tags || []
    }));

    res.json({ total, page: pageNum, limit: lim, results: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;