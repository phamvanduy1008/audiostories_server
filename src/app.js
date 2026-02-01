import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import storyRoutes from "./routes/story.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import userRoutes from "./routes/user.routes.js";
import savedStoryRoutes from "./routes/savestory.routes.js";
import historyRoutes from "./routes/history.routes.js";

dotenv.config();
connectDB();

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://audiostories.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Story Audio API Running...");
});

app.get("/log", (req, res) => {
  console.log("Deploy check: success");
  res.status(200).json({ message: "Deploy successful" });
});

app.use("/audio", express.static("public/audio"));

app.use("/api/stories", storyRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/savestories", savedStoryRoutes);
app.use("/api/history", historyRoutes);

export default app;
