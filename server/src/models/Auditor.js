import mongoose from "mongoose";
import createUserSchema from "./userSchemaFactory.js";

const auditorSchema = createUserSchema("auditor");

const Auditor = mongoose.model("Auditor", auditorSchema, "auditors");

export default Auditor;
