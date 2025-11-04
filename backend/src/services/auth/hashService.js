/**
 * Hash Service
 * -------------
 * Handles password hashing and comparison.
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(password, salt);
}

export async function comparePassword(plainText, hash) {
  return await bcrypt.compare(plainText, hash);
}