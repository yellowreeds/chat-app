/**
 * Authentication Controller
 * --------------------------
 * Handles HTTP requests for user authentication.
 * Delegates all business logic to authService.
 */

import * as authService from "../services/auth/authService.js";
import { attachAuth } from "../services/auth/tokenService.js";

/* -------------------------------------------------------------------------- */
/* 🧠 1️⃣ Sign Up a New User                                                  */
/* -------------------------------------------------------------------------- */
export async function signup(req, res, next) {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ ok: false, message: "All fields are required." });
    }

    const user = await authService.signup({ fullName, email, password });
    const token = attachAuth(res, user); // ✅ generate and return token

    res.status(201).json({
      ok: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
      },
    });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(400).json({ ok: false, message: err.message });
  }
}

/* -------------------------------------------------------------------------- */
/* 🔑 2️⃣ Log In Existing User                                                */
/* -------------------------------------------------------------------------- */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Email and password required." });
    }

    const user = await authService.login({ email, password });
    const token = attachAuth(res, user); // ✅ generate and return token

    res.status(200).json({
      ok: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(400).json({ ok: false, message: err.message });
  }
}

/* -------------------------------------------------------------------------- */
/* 🚪 3️⃣ Log Out (clear cookie if any)                                      */
/* -------------------------------------------------------------------------- */
export async function logout(req, res, next) {
  try {
    await authService.logout(res);
    res.status(200).json({ ok: true, message: "Logged out successfully." });
  } catch (err) {
    console.error("❌ Logout error:", err);
    res.status(400).json({ ok: false, message: err.message });
  }
}

/* -------------------------------------------------------------------------- */
/* 🧑‍🎨 4️⃣ Update User Profile Picture                                      */
/* -------------------------------------------------------------------------- */
export async function updateProfile(req, res, next) {
  try {
    const { profilePic } = req.body;
    if (!profilePic) {
      return res.status(400).json({ ok: false, message: "Profile picture is required." });
    }

    const userId = req.user._id;
    const updatedUser = await authService.updateProfile({ userId, profilePic });
    res.status(200).json({ ok: true, data: updatedUser });
  } catch (err) {
    console.error("❌ Update profile error:", err);
    res.status(400).json({ ok: false, message: err.message });
  }
}

/* -------------------------------------------------------------------------- */
/* 🧾 5️⃣ Verify Current Session                                             */
/* -------------------------------------------------------------------------- */
export async function checkAuth(req, res) {
  res.status(200).json({ ok: true, data: req.user });
}