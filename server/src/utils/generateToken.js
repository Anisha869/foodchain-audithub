import jwt from "jsonwebtoken";

/**
 * Generate a signed JWT for a given user.
 * Payload intentionally kept minimal (id + role) — never put
 * sensitive data like password hashes in a token payload.
 */
const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export default generateToken;
