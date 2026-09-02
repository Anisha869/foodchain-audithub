import mongoose from "mongoose";
import createUserSchema from "./userSchemaFactory.js";

const reviewerSchema = createUserSchema("reviewer");

const Reviewer = mongoose.model("Reviewer", reviewerSchema);

export default Reviewer;
