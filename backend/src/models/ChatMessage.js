const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },

    type: { type: String, enum: ["text", "image", "file", "audio", "video", "system"], default: "text" },
    content: { type: String, required: true },

    media: {
      url: String,
      name: String,
      size: Number,
      mimeType: String,
    },

    isRead: { type: Boolean, default: false },
    readAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true }
);

chatMessageSchema.index({ room: 1, createdAt: 1 });
chatMessageSchema.index({ sender: 1, recipient: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
