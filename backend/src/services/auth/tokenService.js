/**
 * Token Service
 * --------------
 * Handles JWT token generation and (optionally) cookies.
 */

import jwt from "jsonwebtoken";

const TOKEN_EXPIRE_DAYS = 7;

/**
 * Create a signed JWT token for the given userId.
 */
export function generateAuthToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: `${TOKEN_EXPIRE_DAYS}d` });
}

/**
 * Attach JWT token to response (optional cookie, can be removed later)
 */
export function attachAuth(res, user) {
  const token = generateAuthToken(user._id);
  console.log(token);
  // Optional cookie (comment out if you want token-only)
  // res.cookie("jwt", token, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === "production",
  //   sameSite: "strict",
  //   maxAge: TOKEN_EXPIRE_DAYS * 24 * 60 * 60 * 1000,
  // });
  return token;
}