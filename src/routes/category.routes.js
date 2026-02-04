import express from "express";
import { Category } from "../models/schema.js";

const router = express.Router();

/* GET ALL CATEGORIES */
router.get("/", async (req, res) => {
  const categories = await Category.find().select("_id name");
  res.json(categories);
});


export default router;
