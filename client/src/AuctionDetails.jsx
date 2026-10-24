
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import "./AuctionDetails.css";

const API_URL = "https://bid-sphere-backend-rgys.onrender.com/api";
const SERVER_URL = "https://bid-sphere-backend-rgys.onrender.com";

function AuctionDetails() {
  const { id } = useParams();

  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bidAmount, setBidAmount] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [bidMessageType, setBidMessageType] = useState("");
  const [bidLoading, setBidLoading] = useState(false);

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(`${API_URL}/auctions/${id}`);
        const selectedAuction = response.data.auction || response.data;

        if (!selectedAuction?._id) {
          setError("Auction not found.");
          return;
        }

        setAuction(selectedAuction);
      } catch (err) {
        console.error("Fetch auction error:", err);

        if (err.response?.status === 404) {
          setError("Auction not found.");
        } else {
          setError(
            err.response?.data?.message ||
              "Unable to load auction details. Please try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAuction();
  }, [id]);

  const handleBidSubmit = async (event) => {
    event.preventDefault();
    setBidMessage("");
    setBidMessageType("");

    const token = localStorage.getItem("token");

    if (!token) {
      setBidMessage("Please log in before placing a bid.");
      setBidMessageType("error");
      return;
    }

    if (!bidAmount || Number(bidAmount) <= 0) {
      setBidMessage("Please enter a valid bid amount.");
      setBidMessageType("error");
      return;
    }

    try {
      setBidLoading(true);

      const response = await axios.post(
        `${API_URL}/bids/${id}`,
        { amount: Number(bidAmount) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setBidMessage(
        response.data.message || "Your bid was submitted successfully!"
      );
      setBidMessageType("success");
      setBidAmount("");
    } catch (err) {
      console.error("Place bid error:", err);

      setBidMessage(
        err.response?.status === 401
          ? "Your login session is invalid or expired. Please log in again."
          : err.response?.data?.message ||
              "Failed to place bid. Please try again."
      );
      setBidMessageType("error");
    } finally {
      setBidLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="auction-details">
        <p>Loading auction details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auction-details">
        <h2>Unable to Load Auction</h2>
        <p>{error}</p>
        <p>
          <Link to="/browse-auctions">Back to Browse Auctions</Link>
        </p>
      </div>
    );
  }

  if (!auction) {
    return <p>Auction not found.</p>;
  }

  return (
    <div className="auction-details">
      <h1>{auction.title}</h1>

      <p>
        <strong>Description:</strong>{" "}
        {auction.description || "No description available"}
      </p>

      <p>
        <strong>Auction Type:</strong>{" "}
        {auction.type === "reverse" ? "Reverse Auction" : "Forward Auction"}
      </p>

      <p>
        <strong>Starting Amount:</strong>{" "}
        {auction.amount != null ? `₹${auction.amount}` : "Not specified"}
      </p>

      <p>
        <strong>Deadline:</strong>{" "}
        {auction.deadline
          ? new Date(auction.deadline).toLocaleString()
          : "Not specified"}
      </p>

      {auction.createdBy && (
        <p>
          <strong>Created By:</strong>{" "}
          {typeof auction.createdBy === "object"
            ? auction.createdBy.fullName || "Auction Creator"
            : "Auction Creator"}
        </p>
      )}

      <section className="auction-attachments">
        <h2>Product Images & Documents</h2>

        {!auction.attachments?.length ? (
          <p>No images or documents were uploaded for this auction.</p>
        ) : (
          <div className="auction-attachment-list">
            {auction.attachments.map((file) => {
              const fileUrl = `${SERVER_URL}${file.fileUrl}`;

              return (
                <div
                  className="auction-attachment"
                  key={file._id || file.fileUrl}
                >
                  {file.fileType === "image" ? (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={fileUrl}
                        alt={file.originalName}
                        className="auction-attachment-image"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <div className="auction-pdf">
                      <span>PDF: {file.originalName}</span>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View PDF
                      </a>
                    </div>
                  )}

                  <p>{file.originalName}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <hr />

      <h2>Place Your Bid</h2>

      {auction.acceptedBid ? (
        <p>This auction has already accepted a bid and is closed.</p>
      ) : (
        <form onSubmit={handleBidSubmit}>
          <label htmlFor="bidAmount">Your Bid Amount (₹)</label>
          <input
            id="bidAmount"
            type="number"
            min="0.01"
            step="0.01"
            value={bidAmount}
            onChange={(event) => setBidAmount(event.target.value)}
            placeholder="Enter your bid amount"
            required
          />

          <button type="submit" disabled={bidLoading}>
            {bidLoading ? "Submitting..." : "Submit Bid"}
          </button>
        </form>
      )}

      {bidMessage && (
        <p
          style={{
            color: bidMessageType === "success" ? "green" : "red",
          }}
        >
          {bidMessage}
        </p>
      )}

      <p>
        <Link to="/browse-auctions">Back to Browse Auctions</Link>
      </p>
    </div>
  );
}

export default AuctionDetails;
