import jwt from "jsonwebtoken";
import { findUserByIdAndRole, findUserById } from "../utils/roleModels.js";

/**
 * Verifies the Bearer JWT on the Authorization header and attaches
 * the authenticated user (without password) to req.user.
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, invalid or expired token" });
    }

    let user;
    if (decoded.role) {
      user = await findUserByIdAndRole(decoded.id, decoded.role);
    } else {
      user = await findUserById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ message: "Not authorized, user no longer exists" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated. Contact an administrator." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(500).json({ message: "Server error during authentication" });
  }
};

