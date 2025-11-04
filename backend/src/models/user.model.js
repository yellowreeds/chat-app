/**
 * User Model
 * -----------
 * Stores user authentication and profile data.
 */

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    profilePic: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "users",
  }
);

export const User = mongoose.model("User", userSchema);
export default User;