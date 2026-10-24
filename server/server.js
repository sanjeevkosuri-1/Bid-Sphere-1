const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");

const auctionRoutes = require("./routes/auctionRoutes");
const authRoutes = require("./routes/authRoutes");
const bidRoutes = require("./routes/bidRoutes");

const startAuctionCleanup = require("./jobs/auctionCleanup");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve auction images and PDFs
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// Debug route
app.get("/debug-bidsphere", (req, res) => {
  res.status(200).send("Correct BidSphere server is running!");
});

// Home route
app.get("/", (req, res) => {
  res.status(200).send("Auction Marketplace Backend is running!");
});

// API routes
app.use("/api/auctions", auctionRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bids", bidRoutes);

// Start server
const PORT = process.env.PORT||5001;

const startServer = async () => {
  try {
    await connectDB();

    // Start automatic 10-day auction expiry cleanup.
    startAuctionCleanup();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`BidSphere server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "Failed to start BidSphere server:",
      error.message
    );
    process.exit(1);
  }
};

startServer();
