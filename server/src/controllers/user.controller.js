import { ALL_ROLE_MODELS, getModelByRole, findUserById } from "../utils/roleModels.js";

// @route   GET /api/users
// @access  Private (Admin)
export const getUsers = async (req, res) => {
  try {
    const { role, search, isActive } = req.query;
    const filter = {};

    if (isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    let users = [];

    if (role && role !== "ALL") {
      const Model = getModelByRole(role);
      if (Model) {
        let query = Model.find(filter).select("-password").sort({ createdAt: -1 });
        if (role === "customer") query = query.populate("customerId", "companyName code");
        users = await query;
      }
    } else {
      const results = await Promise.all(
        ALL_ROLE_MODELS.map((Model) =>
          Model.find(filter).select("-password").sort({ createdAt: -1 })
        )
      );
      users = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.status(200).json({
      success: true,
      count: users.length,
      users,
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
    const { name, email, password, role, phone, customerId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Name, email, password, and role are required" });
    }

    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const user = await Model.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role,
      phone,
      customerId: customerId || null,
      isActive: true,
    });

    res.status(201).json({
      message: "User account created successfully",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Create user error:", error.message);
    res.status(500).json({ message: "Server error while creating user" });
  }
};

// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    const { name, phone, role, customerId } = req.body;

    const user = await findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (customerId !== undefined) user.customerId = customerId || null;

    await user.save();

    res.status(200).json({
      message: "User updated successfully",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Update user error:", error.message);
    res.status(500).json({ message: "Server error while updating user" });
  }
};

// @route   PATCH /api/users/:id/toggle-status
// @access  Private (Admin)
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Toggle user status error:", error.message);
    res.status(500).json({ message: "Server error while changing user status" });
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

    const user = await findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "User password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ message: "Server error while resetting password" });
  }
};
