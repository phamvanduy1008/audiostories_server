import mongoose from "mongoose";

/* ================= USER ================= */
const UserSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  avatar: String,
  role: { type: String, default: "user" },
  status: { type: String, default: "active" }
}, { timestamps: true });


/* ================= CATEGORY ================= */
const CategorySchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String
});


/* ================= STORY ================= */
const StorySchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true },
  description: String,
  coverImage: String,
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  tags: [String],
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  status: { type: String, default: "published" }
}, { timestamps: true });


/* ================= CHAPTER ================= */
const ChapterSchema = new mongoose.Schema({
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
  title: String,
  order: Number,
  content: String,
  name: String,
  duration: {
  type: String, 
  default: null
}


}, { timestamps: true });


/* ================= COMMENT ================= */
const CommentSchema = new mongoose.Schema({
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null
  }
}, { timestamps: true });


/* ================= SAVED STORIES ================= */
const SavedStorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true },

  lastChapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" }
}, { timestamps: true });

SavedStorySchema.index({ userId: 1, storyId: 1 }, { unique: true });



/* ================= LISTENING HISTORY ================= */
const HistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true },
  lastPosition: { type: Number, default: 0 },
  duration: { type: Number },
  progressPercent: { type: Number },
  isCompleted: { type: Boolean, default: false },
}, { timestamps: true });

HistorySchema.index({ userId: 1, storyId: 1, chapterId: 1 }, { unique: true });


/* ================= EXPORT MODELS ================= */
export const User = mongoose.model("User", UserSchema);
export const Category = mongoose.model("Category", CategorySchema);
export const Story = mongoose.model("Story", StorySchema);
export const Chapter = mongoose.model("Chapter", ChapterSchema);
export const Comment = mongoose.model("Comment", CommentSchema);
export const  SavedStory= mongoose.model("SavedStory", SavedStorySchema);
export const History = mongoose.model("History", HistorySchema);
