import dbService from "../services/dbService.js";
import bcrypt from "bcryptjs";

// @route   GET /api/users
// @access  Private (Admin)
export const getUsers = async (req, res) => {
  try {
    const { role, search, isActive, approvalStatus } = req.query;
    const filter = {};

    if (isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }
    if (role && role !== "ALL") {
      filter.role = role;
    }
    if (search) {
      filter.search = search;
    }
    if (approvalStatus && ["pending", "approved", "rejected"].includes(approvalStatus)) {
      filter.approvalStatus = approvalStatus;
    }

    const users = await dbService.getUsers(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      users: users.map((u) => u.toSafeObject()),
    });
  } catch (error) {
    console.error("Get users error:", error.message);
    res.status(500).json({ message: "Server error while fetching users" });
  }
};

// @route   POST /api/users
// @access  Private (Admin)
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, customerId, specialization, certifications, experienceYears, qualification, auditorIdCode, address, bio } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required" });
    }
    if (!["admin", "planner", "auditor", "reviewer", "customer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const existing = await dbService.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    const certsArray = Array.isArray(certifications)
      ? certifications
      : (typeof certifications === "string" ? certifications.split(",").map((c) => c.trim()).filter(Boolean) : []);

    const user = await dbService.createUser({
      name,
      email: email.toLowerCase().trim(),
      password,
      role,
      phone: phone || "",
      customerId: role === "customer" ? customerId : null,
      specialization: specialization || "",
      certifications: certsArray,
      experienceYears: Number(experienceYears) || 0,
      qualification: qualification || "",
      auditorIdCode: auditorIdCode || "",
      address: address || "",
      bio: bio || "",
      isActive: true,
    });

    res.status(201).json({
      message: "User created successfully",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Create user error:", error.message);
    res.status(500).json({ message: "Server error while creating user" });
  }
};

// @route   GET /api/users/:id
// @access  Private (Admin)
export const getUserById = async (req, res) => {
  try {
    const user = await dbService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Get user error:", error.message);
    res.status(500).json({ message: "Server error while fetching user" });
  }
};

// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    const { name, role, phone, isActive, specialization, certifications, experienceYears, qualification, auditorIdCode, address, bio } = req.body;

    if (role && !["admin", "planner", "auditor", "reviewer", "customer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const user = await dbService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updates = {};
    if (name) updates.name = name;
    if (role && ["admin", "planner", "auditor", "reviewer", "customer"].includes(role)) updates.role = role;
    if (phone !== undefined) updates.phone = phone;
    if (isActive !== undefined) updates.isActive = isActive;
    if (specialization !== undefined) updates.specialization = specialization;
    if (certifications !== undefined) {
      updates.certifications = Array.isArray(certifications)
        ? certifications
        : (typeof certifications === "string" ? certifications.split(",").map((c) => c.trim()).filter(Boolean) : []);
    }
    if (experienceYears !== undefined) updates.experienceYears = Number(experienceYears) || 0;
    if (qualification !== undefined) updates.qualification = qualification;
    if (auditorIdCode !== undefined) updates.auditorIdCode = auditorIdCode;
    if (address !== undefined) updates.address = address;
    if (bio !== undefined) updates.bio = bio;

    const updated = await dbService.updateUser(req.params.id, updates);

    res.status(200).json({
      message: "User updated successfully",
      user: updated.toSafeObject(),
    });
  } catch (error) {
    console.error("Update user error:", error.message);
    res.status(500).json({ message: "Server error while updating user" });
  }
};

// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res) => {
  try {
    if (req.user._id?.toString() === req.params.id || req.user.id?.toString() === req.params.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = await dbService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await dbService.deleteUser(req.params.id);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error.message);
    res.status(500).json({ message: "Server error while deleting user" });
  }
};

// @route   PATCH /api/users/:id/toggle-status
// @access  Private (Admin)
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await dbService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updated = await dbService.updateUser(req.params.id, {
      isActive: !user.isActive,
    });

    res.status(200).json({
      message: `User ${updated.isActive ? "activated" : "deactivated"} successfully`,
      user: updated.toSafeObject(),
    });
  } catch (error) {
    console.error("Toggle user status error:", error.message);
    res.status(500).json({ message: "Server error while toggling user status" });
  }
};

// @route   PATCH /api/users/:id/approve
// @access  Private (Admin)
export const approveUser = async (req, res) => {
  try {
    const user = await dbService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!["auditor", "planner", "reviewer"].includes(user.role) || user.approvalStatus !== "pending") {
      return res.status(409).json({ message: "This account is not a pending staff signup request" });
    }

    const updated = await dbService.updateUser(req.params.id, {
      isActive: true,
      approvalStatus: "approved",
    });
    if (!updated) {
      return res.status(500).json({ message: "Account approval did not update the user" });
    }

    res.status(200).json({
      message: "Staff signup approved successfully",
      user: updated.toSafeObject(),
    });
  } catch (error) {
    console.error("Approve user error:", error.message);
    res.status(500).json({ message: "Server error while approving staff signup" });
  }
};

// @route   POST /api/users/:id/reset-password
// @access  Private (Admin)
export const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await dbService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ message: "Server error while resetting password" });
  }
};
