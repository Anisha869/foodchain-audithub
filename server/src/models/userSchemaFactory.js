import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Factory that builds the common user schema used by every role-specific model.
 *
 * @param {string}  role         – The hard-coded role for this collection (e.g. "admin").
 * @param {Object}  [extraFields={}] – Additional schema fields specific to a role.
 * @returns {mongoose.Schema}
 */
const createUserSchema = (role, extraFields = {}) => {
  const schema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
      },
      email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
      },
      password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 6,
        select: false, // never returned by default queries
      },
      role: {
        type: String,
        default: role,
        immutable: true, // role is fixed per collection
      },
      phone: {
        type: String,
        trim: true,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      lastLoginAt: {
        type: Date,
        default: null,
      },
      ...extraFields,
    },
    { timestamps: true }
  );

  // ----- Hooks ----------------------------------------------------------

  // Hash password before saving, only if modified
  schema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });

  // ----- Instance methods -----------------------------------------------

  schema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };

  // Never leak password hash
  schema.methods.toSafeObject = function () {
    const obj = {
      id: this._id,
      name: this.name,
      email: this.email,
      role: this.role,
      phone: this.phone,
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
    };
    // Include customerId when present (CustomerUser model)
    if (this.customerId !== undefined) {
      obj.customerId = this.customerId;
    }
    return obj;
  };

  return schema;
};

export default createUserSchema;
