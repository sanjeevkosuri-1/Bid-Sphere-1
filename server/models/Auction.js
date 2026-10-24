const mongoose = require("mongoose");

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

const attachmentSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["image", "pdf"],
      required: true,
    },
    mimeType: {
      type: String,
      enum: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ],
      required: true,
    },
  },
  { _id: true }
);

const auctionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["forward", "reverse"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // Automatically expires 10 days after creation
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + TEN_DAYS_MS),
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: function (files) {
          return files.length <= 5;
        },
        message: "A maximum of 5 attachments is allowed.",
      },
    },

    acceptedBid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bid",
      default: null,
    },

    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Auction", auctionSchema);