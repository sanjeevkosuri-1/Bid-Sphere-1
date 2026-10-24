
const Auction = require("../models/Auction");
const Bid = require("../models/Bid");
const fs = require("fs");
const path = require("path");

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

const uploadDirectory = path.join(__dirname, "../uploads/auctions");

let cleanupRunning = false;

async function cleanupExpiredAuctions() {
  if (cleanupRunning) {
    return;
  }

  cleanupRunning = true;

  try {
    // Step 1: Set expiry dates for older auctions
    // that do not have an expiresAt field.
    await Auction.updateMany(
      {
        expiresAt: { $exists: false },
        createdAt: { $type: "date" },
      },
      [
        {
          $set: {
            expiresAt: {
              $add: ["$createdAt", TEN_DAYS_MS],
            },
          },
        },
      ],
      { updatePipeline: true }
    );

    // Step 2: Find auctions that have expired.
    const now = new Date();

    const expiredAuctions = await Auction.find({
      expiresAt: { $lte: now },
    }).lean();

    if (expiredAuctions.length === 0) {
      return;
    }

    const auctionIds = expiredAuctions.map(
      (auction) => auction._id
    );

    // Step 3: Delete uploaded images and PDF attachments.
    for (const auction of expiredAuctions) {
      for (const attachment of auction.attachments || []) {
        const filename = path.basename(attachment.fileUrl);
        const filePath = path.join(uploadDirectory, filename);

        try {
          await fs.promises.unlink(filePath);
        } catch (error) {
          if (error.code !== "ENOENT") {
            console.error(
              "Unable to delete attachment:",
              error.message
            );
          }
        }
      }
    }

    // Step 4: Delete all bids associated with expired auctions.
    await Bid.deleteMany({
      auction: { $in: auctionIds },
    });

    // Step 5: Delete expired auctions, including auctions
    // that already have an accepted bid.
    const result = await Auction.deleteMany({
      _id: { $in: auctionIds },
      expiresAt: { $lte: now },
    });

    console.log(
      `Auction cleanup complete: ${result.deletedCount} expired auctions deleted.`
    );
  } catch (error) {
    console.error("Auction cleanup failed:", error);
  } finally {
    cleanupRunning = false;
  }
}

function startAuctionCleanup() {
  // Run cleanup when the backend starts.
  cleanupExpiredAuctions();

  // Check for expired auctions every minute.
  setInterval(cleanupExpiredAuctions, 60 * 1000);
}

module.exports = startAuctionCleanup;
