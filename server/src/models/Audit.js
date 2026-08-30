import mongoose from "mongoose";

const AUDIT_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const auditSchema = new mongoose.Schema(
  {
    auditRef: {
      type: String,
      required: [true, "Audit reference is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer reference is required"],
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "Site reference is required"],
    },
    auditorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auditor",
      default: null,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reviewer",
      default: null,
    },
    standard: {
      type: String,
      trim: true,
      default: "FSSAI",
    },
    scheduledDate: {
      type: Date,
      required: [true, "Scheduled date is required"],
    },
    completedDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: AUDIT_STATUSES,
      default: "SCHEDULED",
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    checklistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checklist",
      default: null,
    },
    answers: [
      {
        itemId: { type: String },
        question: { type: String, required: true },
        category: { type: String, default: "General" },
        score: { type: Number, default: 0 },
        maxScore: { type: Number, default: 10 },
        comment: { type: String, default: "" },
        severity: { type: String, default: "None" }, // Critical, Major, Minor, Observation, None
        evidence: { type: String, default: "" },
      },
    ],
    reviewerComments: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

auditSchema.index({ customerId: 1, status: 1 });
auditSchema.index({ auditorId: 1 });
auditSchema.index({ scheduledDate: -1 });

const Audit = mongoose.model("Audit", auditSchema);

export default Audit;
export { AUDIT_STATUSES };
