const express = require("express");
const mongoose = require("mongoose");

const Bid = require("../models/Bid");
const Auction = require("../models/Auction");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const findActiveAuction = async (auctionId) => {
  return Auction.findOne({
    _id: auctionId,
    expiresAt: { $gt: new Date() },
  });
};

// SUBMIT OR UPDATE A BID
router.post("/:auctionId", authMiddleware, async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      return res.status(400).json({ message: "Invalid auction ID." });
    }

    if (
      req.body.amount === undefined ||
      req.body.amount === null ||
      req.body.amount === ""
    ) {
      return res.status(400).json({ message: "Please enter a bid amount." });
    }

    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Please enter a valid positive bid amount.",
      });
    }

    const auction = await findActiveAuction(auctionId);

    if (!auction) {
      return res.status(404).json({
        message: "Auction not found or has expired.",
      });
    }

    if (auction.createdBy.toString() === userId) {
      return res.status(403).json({
        message: "You cannot bid on your own auction.",
      });
    }

    if (auction.acceptedBid) {
      return res.status(400).json({
        message: "A bid has already been accepted. Bidding is closed.",
      });
    }

    if (!["forward", "reverse"].includes(auction.type)) {
      return res.status(400).json({ message: "Invalid auction type." });
    }

    const existingBid = await Bid.findOne({
      auction: auctionId,
      bidder: userId,
    });

    const otherBids = await Bid.find({
      auction: auctionId,
      bidder: { $ne: userId },
    });

    if (auction.type === "forward") {
      const highestBid = otherBids.reduce(
        (highest, bid) => Math.max(highest, bid.amount),
        Number(auction.amount)
      );

      if (amount <= highestBid) {
        return res.status(400).json({
          message: `Your bid must be higher than ₹${highestBid}.`,
        });
      }
    }

    if (auction.type === "reverse") {
      const lowestOffer = otherBids.reduce(
        (lowest, bid) => Math.min(lowest, bid.amount),
        Number(auction.amount)
      );

      if (amount >= lowestOffer) {
        return res.status(400).json({
          message: `Your offer must be lower than ₹${lowestOffer}.`,
        });
      }
    }

    let bid;
    let message;
    let statusCode;

    if (existingBid) {
      existingBid.amount = amount;
      bid = await existingBid.save();
      message = "Your previous bid has been updated successfully!";
      statusCode = 200;
    } else {
      bid = await Bid.create({
        auction: auctionId,
        bidder: userId,
        amount,
      });
      message = "Your bid has been submitted successfully!";
      statusCode = 201;
    }

    return res.status(statusCode).json({ message, bid });
  } catch (error) {
    console.error("Submit bid error:", error);

    return res.status(500).json({
      message: "Unable to submit your bid.",
    });
  }
});

// MY BIDS
router.get("/my-bids", authMiddleware, async (req, res) => {
  try {
    const bids = await Bid.find({
      bidder: req.user.userId,
    })
      .populate(
        "auction",
        "title type amount expiresAt acceptedBid winner"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json(bids);
  } catch (error) {
    console.error("Get my bids error:", error);

    return res.status(500).json({
      message: "Unable to retrieve your bids.",
    });
  }
});

// ACCEPT A BID - ONLY THE CREATOR
router.post(
  "/:auctionId/accept/:bidId",
  authMiddleware,
  async (req, res) => {
    try {
      const { auctionId, bidId } = req.params;
      const userId = req.user.userId;

      if (
        !mongoose.Types.ObjectId.isValid(auctionId) ||
        !mongoose.Types.ObjectId.isValid(bidId)
      ) {
        return res.status(400).json({
          message: "Invalid auction ID or bid ID.",
        });
      }

      const auction = await findActiveAuction(auctionId);

      if (!auction) {
        return res.status(404).json({
          message: "Auction not found or has expired.",
        });
      }

      if (auction.createdBy.toString() !== userId) {
        return res.status(403).json({
          message: "Only the auction creator can accept a bid.",
        });
      }

      if (auction.acceptedBid) {
        return res.status(400).json({
          message: "A bid has already been accepted for this auction.",
        });
      }

      const bid = await Bid.findOne({
        _id: bidId,
        auction: auctionId,
      });

      if (!bid) {
        return res.status(404).json({
          message: "This bid does not belong to the selected auction.",
        });
      }

      const updatedAuction = await Auction.findOneAndUpdate(
        {
          _id: auctionId,
          createdBy: userId,
          acceptedBid: null,
          expiresAt: { $gt: new Date() },
        },
        {
          $set: {
            acceptedBid: bid._id,
            winner: bid.bidder,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedAuction) {
        return res.status(409).json({
          message: "The auction expired or another bid was accepted.",
        });
      }

      return res.status(200).json({
        message: "Bid accepted successfully!",
        acceptedBid: bid._id,
        winner: bid.bidder,
      });
    } catch (error) {
      console.error("Accept bid error:", error);

      return res.status(500).json({
        message: "Unable to accept this bid.",
      });
    }
  }
);

// VIEW A BIDDER OR CREATOR PROFILE
router.get(
  "/:auctionId/profile/:userId",
  authMiddleware,
  async (req, res) => {
    try {
      const { auctionId, userId: profileUserId } = req.params;
      const requesterId = req.user.userId;

      if (
        !mongoose.Types.ObjectId.isValid(auctionId) ||
        !mongoose.Types.ObjectId.isValid(profileUserId)
      ) {
        return res.status(400).json({
          message: "Invalid auction ID or user ID.",
        });
      }

      const auction = await findActiveAuction(auctionId);

      if (!auction) {
        return res.status(404).json({
          message: "Auction not found or has expired.",
        });
      }

      const isCreator = auction.createdBy.toString() === requesterId;
      const isWinner =
        auction.winner && auction.winner.toString() === requesterId;

      if (!isCreator && !isWinner) {
        return res.status(403).json({
          message: "You are not allowed to view this profile.",
        });
      }

      const isProfileOwner =
        auction.createdBy.toString() === profileUserId;

      const isAuctionBidder = await Bid.exists({
        auction: auctionId,
        bidder: profileUserId,
      });

      if (!isProfileOwner && !isAuctionBidder) {
        return res.status(404).json({
          message: "This user is not associated with this auction.",
        });
      }

      const profile = await User.findById(profileUserId).select(
        "fullName email phone"
      );

      if (!profile) {
        return res.status(404).json({
          message: "User profile not found.",
        });
      }

      const isAcceptedParticipant =
        Boolean(auction.acceptedBid) &&
        Boolean(auction.winner) &&
        (
          (isCreator && auction.winner.toString() === profileUserId) ||
          (isWinner && auction.createdBy.toString() === profileUserId)
        );

      const result = { fullName: profile.fullName };

      if (isAcceptedParticipant) {
        result.email = profile.email;
        result.phone = profile.phone;
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get bidder profile error:", error);

      return res.status(500).json({
        message: "Unable to retrieve this profile.",
      });
    }
  }
);

// CONTACT DETAILS - CREATOR AND ACCEPTED BIDDER ONLY
router.get(
  "/:auctionId/contact",
  authMiddleware,
  async (req, res) => {
    try {
      const { auctionId } = req.params;
      const requesterId = req.user.userId;

      if (!mongoose.Types.ObjectId.isValid(auctionId)) {
        return res.status(400).json({ message: "Invalid auction ID." });
      }

      const auction = await findActiveAuction(auctionId);

      if (!auction) {
        return res.status(404).json({
          message: "Auction not found or has expired.",
        });
      }

      if (!auction.acceptedBid || !auction.winner) {
        return res.status(400).json({
          message: "No bid has been accepted for this auction yet.",
        });
      }

      const isCreator = auction.createdBy.toString() === requesterId;
      const isWinner = auction.winner.toString() === requesterId;

      if (!isCreator && !isWinner) {
        return res.status(403).json({
          message:
            "Contact details are available only to the auction creator and accepted bidder.",
        });
      }

      const [creator, winner] = await Promise.all([
        User.findById(auction.createdBy).select("fullName email phone"),
        User.findById(auction.winner).select("fullName email phone"),
      ]);

      return res.status(200).json({
        creator: creator
          ? {
              fullName: creator.fullName,
              email: creator.email,
              phone: creator.phone,
            }
          : null,
        winner: winner
          ? {
              fullName: winner.fullName,
              email: winner.email,
              phone: winner.phone,
            }
          : null,
      });
    } catch (error) {
      console.error("Get contact details error:", error);

      return res.status(500).json({
        message: "Unable to retrieve contact details.",
      });
    }
  }
);

// VIEW ALL BIDS - CREATOR ONLY
router.get("/:auctionId", authMiddleware, async (req, res) => {
  try {
    const { auctionId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      return res.status(400).json({ message: "Invalid auction ID." });
    }

    const auction = await findActiveAuction(auctionId);

    if (!auction) {
      return res.status(404).json({
        message: "Auction not found or has expired.",
      });
    }

    if (auction.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Only the auction creator can view all bids.",
      });
    }

    const bids = await Bid.find({ auction: auctionId })
      .populate("bidder", "fullName")
      .sort({ amount: auction.type === "forward" ? -1 : 1 });

    return res.status(200).json(bids);
  } catch (error) {
    console.error("Get auction bids error:", error);

    return res.status(500).json({
      message: "Unable to retrieve bids.",
    });
  }
});

module.exports = router;