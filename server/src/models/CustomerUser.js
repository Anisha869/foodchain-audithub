import mongoose from "mongoose";
import createUserSchema from "./userSchemaFactory.js";

const customerUserSchema = createUserSchema("customer", {
  // Links this login account to a Customer company record
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    default: null,
  },
});

// Explicitly set collection name to "customer_users" to avoid confusion
// with the "customers" collection (which stores company/business entities).
const CustomerUser = mongoose.model("CustomerUser", customerUserSchema, "customer_users");

export default CustomerUser;
