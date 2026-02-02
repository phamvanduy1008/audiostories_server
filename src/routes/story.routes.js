import express from "express";
import { Chapter, Story } from "../models/schema.js";
import mongoose from "mongoose";


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

router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      title,
      slug,
      description = "",
      coverImage = "",
      authorId,
      categoryId,
      tags = [],
      chaptersCount
    } = req.body;

    const count = parseInt(chaptersCount, 10);

    if (!title || !slug) {
      return res.status(400).json({ message: "title and slug are required" });
    }

    if (!count || count < 1) {
      return res
        .status(400)
        .json({ message: "chaptersCount must be >= 1" });
    }

    const exists = await Story.findOne({ slug }).session(session);
    if (exists) {
      return res.status(409).json({ message: "slug already exists" });
    }

    const [story] = await Story.create(
      [
        {
          title,
          slug,
          description,
          coverImage,
          authorId,
          categoryId,
          tags
        }
      ],
      { session }
    );

    /* ========= CREATE CHAPTERS ========= */
    const chapters = [];
    for (let i = 1; i <= count; i++) {
      chapters.push({
        storyId: story._id,
        title: `Chương ${i}`,
        order: i,
        content: `Nội dung chương ${i}...`,
        name: `${String(i).padStart(2, "0")}.m4a`,
        duration: null
      });
    }

    await Chapter.insertMany(chapters, { session });

    /* ========= COMMIT ========= */
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Story created successfully",
      storyId: story._id,
      chaptersCount: count
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error(err);
    res.status(500).json({ message: "Create story failed" });
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

router.post('/stories', async (req, res) => {
  try {
    const {
      title,
      slug: inputSlug,
      description,
      coverImage,
      categoryId,
      tags,
      status = 'published',
      initialChapters = 1,
    } = req.body;

    // Tạo slug unique
    let slug = inputSlug || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let existing = await Story.findOne({ slug });
    let counter = 1;
    while (existing) {
      slug = `${slug}-${counter}`;
      existing = await Story.findOne({ slug });
      counter++;
    }

    const story = new Story({
      title,
      slug,
      description,
      coverImage,
      authorId: req.user?._id || null,
      categoryId,
      tags: tags || [],
      status,
    });

    await story.save();

    if (initialChapters > 0) {
      const chapters = [];
      for (let i = 1; i <= initialChapters; i++) {
        const paddedOrder = i < 10 ? `0${i}` : `${i}`; 
        chapters.push({
          storyId: story._id,
          title: `Chương ${paddedOrder}`,
          order: i, 
          content: '',
          name: `Chương ${paddedOrder}`,
          duration: null,
        });
      }
      await Chapter.insertMany(chapters);
    }

    res.status(201).json({
      message: 'Thêm truyện thành công',
      story,
      chaptersCreated: initialChapters,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
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