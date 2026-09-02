import mongoose from "mongoose";

const SEVERITY_LEVELS = ["critical", "major", "minor", "observation"];
const FINDING_STATUSES = ["open", "in_progress", "resolved", "closed"];

const findingSchema = new mongoose.Schema(
  {
    auditId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Audit",
      required: [true, "Audit reference is required"],
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    severity: {
      type: String,
      enum: SEVERITY_LEVELS,
      required: [true, "Severity level is required"],
    },
    description: {
      type: String,
      required: [true, "Finding description is required"],
      trim: true,
    },
    evidence: {
      type: String,
      trim: true,
    },
    correctiveAction: {
      type: String,
      trim: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: FINDING_STATUSES,
      default: "open",
    },
  },
  { timestamps: true }
);

findingSchema.index({ auditId: 1 });
findingSchema.index({ severity: 1, status: 1 });

const Finding = mongoose.model("Finding", findingSchema);

export default Finding;
export { SEVERITY_LEVELS, FINDING_STATUSES };
