const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const Auction = require("../models/Auction");
const Bid = require("../models/Bid");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDirectory = path.join(
  __dirname,
  "../uploads/auctions"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(
        new Error(
          "Only JPG, PNG, WebP images and PDF files are allowed."
        )
      );
    }

    callback(null, true);
  },
});

const removeUploadedFiles = async (files = []) => {
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.promises.unlink(file.path);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("File cleanup error:", error.message);
        }
      }
    })
  );
};

const removeAuctionAttachments = async (auctions = []) => {
  for (const auction of auctions) {
    for (const attachment of auction.attachments || []) {
      const filename = path.basename(attachment.fileUrl);
      const filePath = path.join(uploadDirectory, filename);

      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("Attachment deletion error:", error.message);
        }
      }
    }
  }
};

const handleUploads = (req, res, next) => {
  upload.array("attachments", MAX_FILES)(req, res, async (error) => {
    if (error) {
      await removeUploadedFiles(req.files || []);

      return res.status(400).json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Each file must be 5 MB or smaller."
            : error.code === "LIMIT_FILE_COUNT"
            ? "You can upload a maximum of 5 files."
            : error.message || "File upload failed.",
      });
    }

    next();
  });
};

const validateUploadedFiles = async (files) => {
  for (const file of files) {
    const buffer = await fs.promises.readFile(file.path);
    let validSignature = false;

    if (file.mimetype === "image/jpeg") {
      validSignature =
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff;
    } else if (file.mimetype === "image/png") {
      validSignature =
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        );
    } else if (file.mimetype === "image/webp") {
      validSignature =
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP";
    } else if (file.mimetype === "application/pdf") {
      validSignature = buffer
        .subarray(0, 1024)
        .toString("latin1")
        .includes("%PDF-");

      if (validSignature) {
        try {
          const parsed = await pdfParse(buffer);

          if ((parsed.text || "").trim().length < 20) {
            throw new Error(
              "Scanned or text-empty PDFs are not allowed. Upload a text-based PDF."
            );
          }
        } catch (error) {
          if (error.message.startsWith("Scanned or text-empty")) {
            throw error;
          }

          throw new Error(
            "Unable to read this PDF. Upload a valid text-based PDF."
          );
        }
      }
    }

    if (!validSignature) {
      throw new Error(
        `The file "${file.originalname}" does not match its declared type.`
      );
    }
  }
};

// CREATE AUCTION
router.post("/", authMiddleware, handleUploads, async (req, res) => {
  const files = req.files || [];

  try {
    const { title, description, type, amount } = req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !type ||
      amount === undefined ||
      amount === ""
    ) {
      await removeUploadedFiles(files);

      return res.status(400).json({
        message: "Please provide all required auction details.",
      });
    }

    if (!["forward", "reverse"].includes(type)) {
      await removeUploadedFiles(files);

      return res.status(400).json({
        message: "Auction type must be forward or reverse.",
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) < 1) {
      await removeUploadedFiles(files);

      return res.status(400).json({
        message: "Amount must be at least 1.",
      });
    }

    await validateUploadedFiles(files);

    const attachments = files.map((file) => ({
      originalName: path
        .basename(file.originalname)
        .replace(/[^\w.\- ]/g, "_"),
      fileUrl: `/uploads/auctions/${file.filename}`,
      fileType:
        file.mimetype === "application/pdf" ? "pdf" : "image",
      mimeType: file.mimetype,
    }));

    const auction = await Auction.create({
      title: title.trim(),
      description: description.trim(),
      type,
      amount: Number(amount),
      createdBy: req.user.userId,
      attachments,
      // expiresAt is automatically set by the Auction model.
    });

    return res.status(201).json({
      message: "Auction created successfully. It will expire after 10 days.",
      auction,
    });
  } catch (error) {
    await removeUploadedFiles(files);
    console.error("Create auction error:", error);

    return res.status(400).json({
      message: error.message || "Unable to create auction.",
    });
  }
});

// MY AUCTIONS
router.get("/my-auctions", authMiddleware, async (req, res) => {
  try {
    const auctions = await Auction.find({
      createdBy: req.user.userId,
      acceptedBid: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: auctions.length,
      auctions,
    });
  } catch (error) {
    console.error("Fetch my auctions error:", error);

    return res.status(500).json({
      message: "Unable to fetch your auctions.",
    });
  }
});

// ACCEPTED AUCTIONS
router.get("/my-accepted", authMiddleware, async (req, res) => {
  try {
    const auctions = await Auction.find({
      createdBy: req.user.userId,
      acceptedBid: { $ne: null },
      expiresAt: { $gt: new Date() },
    })
      .populate({
        path: "acceptedBid",
        select: "amount bidder createdAt",
        populate: {
          path: "bidder",
          select: "fullName",
        },
      })
      .populate("winner", "fullName")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      count: auctions.length,
      auctions,
    });
  } catch (error) {
    console.error("Fetch accepted auctions error:", error);

    return res.status(500).json({
      message: "Unable to fetch accepted auctions.",
    });
  }
});

// BROWSE AUCTIONS
router.get("/", async (req, res) => {
  try {
    const auctions = await Auction.find({
      acceptedBid: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: auctions.length,
      auctions,
    });
  } catch (error) {
    console.error("Browse auctions error:", error);

    return res.status(500).json({
      message: "Unable to fetch auctions.",
    });
  }
});

// GET ONE AUCTION - PUBLIC DETAILS
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid auction ID.",
      });
    }

    const auction = await Auction.findOne({
      _id: id,
      expiresAt: { $gt: new Date() },
    })
      .populate("createdBy", "fullName")
      .populate("acceptedBid");

    if (!auction) {
      return res.status(404).json({
        message: "Auction not found or has expired.",
      });
    }

    return res.status(200).json({ auction });
  } catch (error) {
    console.error("Fetch auction error:", error);

    return res.status(500).json({
      message: "Unable to fetch auction details.",
    });
  }
});

// DELETE AUCTION - CREATOR ONLY
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid auction ID.",
      });
    }

    const auction = await Auction.findOne({
      _id: id,
      createdBy: req.user.userId,
    });

    if (!auction) {
      return res.status(404).json({
        message: "Auction not found or you are not authorized to delete it.",
      });
    }

    if (auction.acceptedBid) {
      return res.status(400).json({
        message: "An accepted auction cannot be deleted manually.",
      });
    }

    await Bid.deleteMany({ auction: auction._id });
    await Auction.findByIdAndDelete(auction._id);
    await removeAuctionAttachments([auction]);

    return res.status(200).json({
      message: "Auction and its bids deleted successfully.",
    });
  } catch (error) {
    console.error("Delete auction error:", error);

    return res.status(500).json({
      message: "Unable to delete auction.",
    });
  }
});

module.exports = router;