import mongoose from "mongoose";

const checklistItemSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    maxScore: {
      type: Number,
      default: 10,
    },
  },
  { _id: true }
);

const checklistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Checklist name is required"],
      trim: true,
    },
    standard: {
      type: String,
      trim: true,
      default: "FSSAI",
    },
    description: {
      type: String,
      trim: true,
    },
    items: [checklistItemSchema],
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerUser",
      default: null,
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

checklistSchema.index({ standard: 1 });
checklistSchema.index({ customerId: 1 });

const Checklist = mongoose.model("Checklist", checklistSchema, "checklists");

export default Checklist;
