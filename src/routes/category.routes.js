import express from "express";
import { Category } from "../models/schema.js";

const router = express.Router();

/* GET ALL CATEGORIES */
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();

    res.json(categories.map(c => ({
      id: c._id,
      name: c.name,
      slug: c.slug,
      description: c.description
    })));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
