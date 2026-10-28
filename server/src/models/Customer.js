import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Customer code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, "Contact person name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Contact email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    industryCategory: {
      type: String,
      default: "Food Processing & Logistics",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

customerSchema.index({ code: 1, companyName: 1 });

const Customer = mongoose.model("Customer", customerSchema, "customers");

export default Customer;
