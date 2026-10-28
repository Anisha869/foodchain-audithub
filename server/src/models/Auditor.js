import mongoose from "mongoose";
import createUserSchema from "./userSchemaFactory.js";

const auditorSchema = createUserSchema("auditor", {
  specialization: {
    type: String,
    trim: true,
    default: "",
  },
  certifications: {
    type: [String],
    default: [],
  },
  experienceYears: {
    type: Number,
    default: 0,
  },
  qualification: {
    type: String,
    trim: true,
    default: "",
  },
  auditorIdCode: {
    type: String,
    trim: true,
    default: "",
  },
  address: {
    type: String,
    trim: true,
    default: "",
  },
  bio: {
    type: String,
    trim: true,
    default: "",
  },
});

const Auditor = mongoose.model("Auditor", auditorSchema, "auditors");

export default Auditor;

