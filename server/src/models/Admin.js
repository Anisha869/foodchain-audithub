import mongoose from "mongoose";
import createUserSchema from "./userSchemaFactory.js";

const adminSchema = createUserSchema("admin");

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
