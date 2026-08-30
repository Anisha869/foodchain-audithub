import mongoose from "mongoose";
import createUserSchema from "./userSchemaFactory.js";

const plannerSchema = createUserSchema("planner");

const Planner = mongoose.model("Planner", plannerSchema);

export default Planner;
