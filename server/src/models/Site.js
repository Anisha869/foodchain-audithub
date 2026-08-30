import mongoose from "mongoose";

const siteSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer reference is required"],
    },
    siteName: {
      type: String,
      required: [true, "Site name is required"],
      trim: true,
    },
    siteCode: {
      type: String,
      required: [true, "Site code is required"],
      uppercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Site address is required"],
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

siteSchema.index({ customerId: 1, siteCode: 1 });

const Site = mongoose.model("Site", siteSchema);

export default Site;
