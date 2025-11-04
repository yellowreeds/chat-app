import { config } from "dotenv";
import { connectDB } from "../lib/db.js";
import User from "../models/user.model.js";

config();

const seedUsers = [
  // Female Users
  {
    email: "hellyr@lumon.com",
    fullName: "Helly R",
    password: "123qweasd",
    profilePic: "https://randomuser.me/api/portraits/women/1.jpg",
  },
  {
    email: "helena.eagen@lumon.com",
    fullName: "Helena Eagen",
    password: "123qweasd",
    profilePic: "https://randomuser.me/api/portraits/women/2.jpg",
  },
  {
    email: "harmony.cobel@lumon.com",
    fullName: "Harmony Cobel",
    password: "123qweasd",
    profilePic: "https://randomuser.me/api/portraits/women/3.jpg",
  },
  {
    email: "ava.wilson@example.com",
    fullName: "Ava Wilson",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/4.jpg",
  },
  {
    email: "isabella.brown@example.com",
    fullName: "Isabella Brown",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/5.jpg",
  },
  {
    email: "mia.johnson@example.com",
    fullName: "Mia Johnson",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/6.jpg",
  },
  {
    email: "charlotte.williams@example.com",
    fullName: "Charlotte Williams",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/7.jpg",
  },
  {
    email: "amelia.garcia@example.com",
    fullName: "Amelia Garcia",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/women/8.jpg",
  },

  // Male Users
  {
    email: "dylang@lumon.com",
    fullName: "Dylan G",
    password: "123qweasd",
    profilePic: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    email: "seth.milchick@lumon.com",
    fullName: "Seth Milchick",
    password: "123qweasd",
    profilePic: "https://randomuser.me/api/portraits/men/2.jpg",
  },
  {
    email: "kier.eagen@lumon.com",
    fullName: "Kier Eagen",
    password: "123qweasd",
    profilePic: "https://randomuser.me/api/portraits/men/3.jpg",
  },
  {
    email: "jame.eagen@lumon.com",
    fullName: "Jame Eagen",
    password: "123qweasd",
    profilePic: "https://randomuser.me/api/portraits/men/4.jpg",
  },
  {
    email: "burtg@lumon.com",
    fullName: "Burt G",
    password: "123qweasd",
    profilePic: "https://randomuser.me/api/portraits/men/5.jpg",
  },
  {
    email: "alexander.martin@example.com",
    fullName: "Alexander Martin",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/men/6.jpg",
  },
  {
    email: "daniel.rodriguez@example.com",
    fullName: "Daniel Rodriguez",
    password: "123456",
    profilePic: "https://randomuser.me/api/portraits/men/7.jpg",
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    await User.insertMany(seedUsers);
    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

// Call the function
seedDatabase();