import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, validate: Number.isInteger },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);