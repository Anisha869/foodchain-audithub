import generateToken from "../utils/generateToken.js";
import { findUserByEmail, getModelByRole } from "../utils/roleModels.js";
import { randomUUID, timingSafeEqual } from "crypto";
import dbService from "../services/dbService.js";

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

    if (user.approvalStatus === "pending") {
      return res.status(403).json({ message: "Your staff account is pending administrator approval." });
    }
    if (user.approvalStatus === "rejected") {
      return res.status(403).json({ message: "Your staff account request was not approved. Contact an administrator." });
    }
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
 * @route   PUT /api/auth/profile
 * @access  Private (any authenticated user)
 */
export const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const { name, phone, specialization, certifications, experienceYears, qualification, auditorIdCode, address, bio } = req.body;

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (specialization !== undefined) user.specialization = specialization;
    if (certifications !== undefined) {
      user.certifications = Array.isArray(certifications)
        ? certifications
        : (typeof certifications === "string" ? certifications.split(",").map((c) => c.trim()).filter(Boolean) : []);
    }
    if (experienceYears !== undefined) user.experienceYears = Number(experienceYears) || 0;
    if (qualification !== undefined) user.qualification = qualification;
    if (auditorIdCode !== undefined) user.auditorIdCode = auditorIdCode;
    if (address !== undefined) user.address = address;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(500).json({ message: "Server error while updating profile" });
  }
};

/**
 * @route   POST /api/auth/register
 * @access  Private (Admin only)
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, specialization, certifications, experienceYears, qualification, auditorIdCode, address, bio } = req.body;

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

    const certsArray = Array.isArray(certifications)
      ? certifications
      : (typeof certifications === "string" ? certifications.split(",").map((c) => c.trim()).filter(Boolean) : []);

    const user = await Model.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role,
      phone,
      specialization: specialization || "",
      certifications: certsArray,
      experienceYears: Number(experienceYears) || 0,
      qualification: qualification || "",
      auditorIdCode: auditorIdCode || "",
      address: address || "",
      bio: bio || "",
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
    const { name, companyName, email, password, phone } = req.body;

    if (!["customer", "auditor", "planner", "reviewer"].includes(role)) {
      return res.status(403).json({ message: "Administrator accounts use the one-time bootstrap flow" });
    }

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    if (role === "customer" && !companyName?.trim()) {
      return res.status(400).json({ message: "Company or facility name is required for customer signup" });
    }

    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    let customerId = null;
    if (role === "customer") {
      const code = `CUS-${randomUUID().slice(0, 8).toUpperCase()}`;
      const customer = await dbService.createCustomer({
        companyName: companyName.trim(),
        code,
        contactPerson: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || "",
        isActive: true,
      });
      customerId = customer._id || customer.id;
    }

    const user = await Model.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      phone,
      customerId,
      isActive: role === "customer",
      approvalStatus: role === "customer" ? "approved" : "pending",
    });

    res.status(201).json({
      message: role === "customer"
        ? "Signup successful. Please sign in to continue."
        : "Signup request saved. An administrator must approve your account before sign-in.",
      pendingApproval: role !== "customer",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Server error during signup" });
  }
};

/**
 * Create the first administrator through a server-configured one-time token.
 * The database RPC serializes concurrent requests and rejects any later call.
 */
export const bootstrapFirstAdmin = async (req, res) => {
  try {
    const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    const { name, email, password, phone, setupToken } = req.body;
    if (!expectedToken) {
      return res.status(503).json({ message: "Administrator bootstrap is not configured on the API host" });
    }

    const expected = Buffer.from(expectedToken);
    const received = Buffer.from(typeof setupToken === "string" ? setupToken : "");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return res.status(401).json({ message: "Invalid administrator setup token" });
    }
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existing = await dbService.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const user = await dbService.bootstrapFirstAdmin({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone || "",
    });

    res.status(201).json({
      message: "First administrator account created. Please sign in.",
      pendingApproval: false,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Administrator bootstrap error:", error.message);
    if (error.code === "P0001") {
      return res.status(409).json({ message: "An administrator has already been bootstrapped" });
    }
    if (error.code === "23505") {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    res.status(500).json({ message: "Administrator bootstrap failed" });
  }
};
