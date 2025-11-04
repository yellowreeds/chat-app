/**
 * Authentication Service
 * -----------------------
 * Contains the main business logic for signup, login, logout, and profile updates.
 */

import User from "../../models/user.model.js";
import { hashPassword, comparePassword } from "./hashService.js";
import { generateAuthToken } from "./tokenService.js";
import { uploadImage } from "../../controllers/utils.controller.js"; // reuse your existing uploader

/* -------------------------------------------------------------------------- */
/* 🧠 1️⃣ Signup new user                                                     */
/* -------------------------------------------------------------------------- */
export async function signup({ fullName, email, password }) {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("User already exists.");

  if (password.length < 6) throw new Error("Password must be at least 6 characters long.");

  const hashedPassword = await hashPassword(password);

  const newUser = new User({ fullName, email, password: hashedPassword });
  await newUser.save();

  return {
    _id: newUser._id,
    fullName: newUser.fullName,
    email: newUser.email,
    profilePic: newUser.profilePic,
  };
}

/* -------------------------------------------------------------------------- */
/* 🔑 2️⃣ Login existing user                                                */
/* -------------------------------------------------------------------------- */
export async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid email or password.");

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) throw new Error("Invalid email or password.");

  // ✅ Return both user info and token
  const token = generateAuthToken(user._id);

  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    profilePic: user.profilePic,
    token,
  };
}

/* -------------------------------------------------------------------------- */
/* 🚪 3️⃣ Logout (token-based, stateless)                                    */
/* -------------------------------------------------------------------------- */
export async function logout() {
  // no cookies to clear anymore (JWT is stored client-side)
  return true;
}

/* -------------------------------------------------------------------------- */
/* 🧑‍🎨 4️⃣ Update profile picture                                          */
/* -------------------------------------------------------------------------- */
export async function updateProfile({ userId, profilePic }) {
  const uploadedUrl = await uploadImage(profilePic);
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { profilePic: uploadedUrl },
    { new: true }
  );

  return {
    _id: updatedUser._id,
    fullName: updatedUser.fullName,
    email: updatedUser.email,
    profilePic: updatedUser.profilePic,
  };
}