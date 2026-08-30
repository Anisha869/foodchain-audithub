import generateToken from "../utils/generateToken.js";
import { findUserByEmail, getModelByRole } from "../utils/roleModels.js";

/**
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const found = await findUserByEmail(email);

    if (!found || !found.user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { user } = found;

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated. Contact an administrator." });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: "Login successful",
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error during login" });
  }
};

/**
 * @route   GET /api/auth/me
 * @access  Private (any authenticated role)
 */
export const getMe = async (req, res) => {
  res.status(200).json({ user: req.user.toSafeObject() });
};

/**
 * @route   POST /api/auth/register
 * @access  Private (Admin only)
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password and role are required" });
    }

    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    const user = await Model.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role,
      phone,
    });

    res.status(201).json({
      message: "User created successfully",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Register user error:", error.message);
    res.status(500).json({ message: "Server error while creating user" });
  }
};

/**
 * Public signup endpoint by role.
 * POST /api/auth/signup/:role
 */
export const signupRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    const user = await Model.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role,
      phone,
    });

    res.status(201).json({
      message: "Signup successful. Please sign in to continue.",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Server error during signup" });
  }
};
