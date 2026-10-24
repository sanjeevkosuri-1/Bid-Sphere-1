
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./MyBids.css";

function MyBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchBids() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          setError("Please log in to view your bids.");
          return;
        }

        const response = await axios.get(
          "https://bid-sphere-backend-rgys.onrender.com/api/bids/my-bids",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setBids(
          Array.isArray(response.data) ? response.data : []
        );
      } catch (err) {
        console.error("Error fetching bids:", err);

        if (err.response?.status === 401) {
          setError(
            "Your login session is invalid or expired. Please log in again."
          );
        } else {
          setError(
            err.response?.data?.message ||
              "Unable to load your bids. Please try again."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBids();
  }, []);

  function getStatus(bid) {
    if (
      bid.auction?.deadline &&
      new Date(bid.auction.deadline) <= new Date()
    ) {
      return "Closed";
    }

    return "Active";
  }

  return (
    <div className="my-bids-page">
      <nav className="my-bids-navbar">
        <Link to="/" className="my-bids-logo">
          BidSphere
        </Link>

        <div className="my-bids-nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/browse-auctions">Browse Auctions</Link>
          <Link to="/profile">Profile</Link>
        </div>
      </nav>

      <main className="my-bids-container">
        <div className="my-bids-header">
          <div>
            <h1>My Bids</h1>
            <p>Track the bids you have placed on auctions.</p>
          </div>

          <Link
            to="/browse-auctions"
            className="browse-bids-button"
          >
            Browse Auctions
          </Link>
        </div>

        {loading ? (
          <p className="my-bids-message">
            Loading your bids...
          </p>
        ) : error ? (
          <div className="my-bids-message my-bids-error">
            <p>{error}</p>
            <Link to="/login">Log In</Link>
          </div>
        ) : bids.length === 0 ? (
          <div className="my-bids-empty">
            <h2>No bids yet</h2>
            <p>Your placed bids will appear here.</p>

            <Link
              to="/browse-auctions"
              className="browse-bids-button"
            >
              Find Auctions
            </Link>
          </div>
        ) : (
          <div className="my-bids-grid">
            {bids.map((bid) => {
              const auction = bid.auction || {};

              return (
                <div className="my-bid-card" key={bid._id}>
                  <div className="my-bid-top">
                    <span className="my-bid-type">
                      {auction.type === "reverse"
                        ? "Reverse Auction"
                        : "Forward Auction"}
                    </span>

                    <span
                      className={`my-bid-status ${getStatus(bid).toLowerCase()}`}
                    >
                      {getStatus(bid)}
                    </span>
                  </div>

                  <h2>{auction.title || "Auction"}</h2>

                  <div className="my-bid-info">
                    <div>
                      <span>Your Bid / Offer</span>
                      <strong>
                        {bid.amount != null
                          ? `₹${Number(bid.amount).toLocaleString("en-IN")}`
                          : "Not available"}
                      </strong>
                    </div>

                    <div>
                      <span>Bid Date</span>
                      <strong>
                        {bid.createdAt
                          ? new Date(
                              bid.createdAt
                            ).toLocaleDateString("en-IN")
                          : "Not available"}
                      </strong>
                    </div>
                  </div>

                  {auction._id && (
                    <Link
                      to={`/auction/${auction._id}`}
                      className="view-bid-button"
                    >
                      View Auction
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default MyBids;
