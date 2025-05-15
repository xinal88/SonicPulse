import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true},
        imageURL: { type: String, required: true},
        clerkId: { type: String, required: true, unique: true},
    },
    { timestamps: true} // Automatically add createdAt and updatedAt timestamps
);

export const User = mongoose.model("User", userSchema);