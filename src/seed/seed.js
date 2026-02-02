import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, Story, Chapter, Category } from "../models/schema.js";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected Mongo Atlas");

    await User.deleteMany();
    await Story.deleteMany();
    await Chapter.deleteMany();
    await Category.deleteMany();

    /* ================= USER ================= */
    const admin = await User.create({
      username: "admin",
      email: "admin@gmail.com",
      password: "123456",
      role: "admin"
    });

    /* ================= CATEGORY ================= */
    const catAudio = await Category.create({
      name: "Truyện Audio",
      slug: "truyen-audio"
    });

    const catRelax = await Category.create({
      name: "Thư Giãn",
      slug: "thu-gian"
    });

    const catStudy = await Category.create({
      name: "Học Tập",
      slug: "hoc-tap"
    });

    /* ================= STORY 1 ================= */
    const story1 = await Story.create({
      title: "Tụ Bảo Tiên Bồn",
      slug: "audio_tubaotienbon",
      description: "Giang Bình An hành trình kỳ bí xoay quanh chiếc tụ bảo thần bí.",
      coverImage: "https://picsum.photos/400/600?random=1",
      authorId: admin._id,
      categoryId: catAudio._id,
      tags: ["Phiêu lưu", "Huyền bí"]
    });

    const chapters1 = [];
    for (let i = 1; i <= 44; i++) {
      chapters1.push({
        storyId: story1._id,
        title: `Chương ${i}`,
        order: i,
        content: `Nội dung chương ${i}...`,
        name: `${i}.m4a`
      });
    }
    await Chapter.insertMany(chapters1);
/* ================= STORY 2 ================= */
const story2 = await Story.create({
  title: "Ta Bị Tông Môn Đem Bán Ở Rể",
  slug: "tabitongmondembanore",
  description: "Một thiếu niên bị tông môn bán làm ở rể, chịu đủ khinh thường, nhưng vận mệnh xoay chuyển khi hắn nắm giữ Vạn Đạo Các.",
  coverImage: "https://picsum.photos/400/600?random=2",
  authorId: admin._id,
  categoryId: catRelax._id,
  tags: ["Huyền huyễn", "Tu tiên", "Ở rể", "Nghịch tập"]
});

/* ================= CHAPTERS STORY 2 ================= */
const chaptersStory2 = [];

for (let i = 1; i <= 104; i++) {
  chaptersStory2.push({
    storyId: story2._id,
    title: `Chương ${i}`,
    order: i,
    content: `Nội dung chương ${i}...`,
    name: `${i}.m4a`
  });
}

await Chapter.insertMany(chaptersStory2);

  

    console.log("🌱 SEED DATA SUCCESSFULLY!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
