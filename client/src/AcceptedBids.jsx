
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./AcceptedBids.css";

const API_URL = "http://localhost:5001/api";

function AcceptedBids() {
  const [auctions, setAuctions] = useState([]);
  const [contacts, setContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAcceptedAuctions = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Please log in to view your accepted bids.");
          return;
        }

        const response = await axios.get(
          `${API_URL}/auctions/my-accepted`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const acceptedAuctions = response.data.auctions || [];
        setAuctions(acceptedAuctions);

        const contactResults = await Promise.all(
          acceptedAuctions.map(async (auction) => {
            try {
              const contactResponse = await axios.get(
                `${API_URL}/bids/${auction._id}/contact`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              return {
                auctionId: auction._id,
                contact: contactResponse.data,
              };
            } catch (err) {
              console.error(
                `Unable to fetch contact for auction ${auction._id}:`,
                err.response?.data?.message || err.message
              );

              return {
                auctionId: auction._id,
                contact: null,
              };
            }
          })
        );

        const contactMap = {};

        contactResults.forEach((result) => {
          contactMap[result.auctionId] = result.contact;
        });

        setContacts(contactMap);
      } catch (err) {
        console.error("Fetch accepted auctions error:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load accepted auctions."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAcceptedAuctions();
  }, []);

  return (
    <div className="accepted-bids-page">
      <header className="accepted-bids-header">
        <div>
          <p className="accepted-bids-eyebrow">BIDSPHERE</p>
          <h1>My Accepted Bids</h1>
          <p className="accepted-bids-subtitle">
            Review your accepted auctions and selected bidder details.
          </p>
        </div>

        <Link to="/dashboard" className="accepted-back-button">
          ← Dashboard
        </Link>
      </header>

      <div className="accepted-summary">
        <div className="accepted-summary-icon">✓</div>
        <div>
          <p>Total Accepted Auctions</p>
          <h2>{auctions.length}</h2>
        </div>
      </div>

      {loading && (
        <div className="accepted-state-card">
          <div className="accepted-loader" />
          <p>Loading accepted auctions...</p>
        </div>
      )}

      {!loading && error && (
        <div className="accepted-state-card accepted-error">
          <h3>Unable to load accepted bids</h3>
          <p>{error}</p>
          {!localStorage.getItem("token") && (
            <Link to="/login" className="accepted-primary-button">
              Log In
            </Link>
          )}
        </div>
      )}

      {!loading && !error && auctions.length === 0 && (
        <div className="accepted-state-card">
          <div className="accepted-empty-icon">▤</div>
          <h2>No accepted bids yet</h2>
          <p>
            When a bid is accepted, the auction and selected bidder
            details will appear here.
          </p>
          <Link
            to="/browse-auctions"
            className="accepted-primary-button"
          >
            Browse Auctions
          </Link>
        </div>
      )}

      {!loading && !error && auctions.length > 0 && (
        <div className="accepted-auctions-list">
          {auctions.map((auction) => {
            const acceptedBid = auction.acceptedBid;
            const bidder = auction.winner || acceptedBid?.bidder;
            const contact = contacts[auction._id];

            return (
              <article
                className="accepted-auction-card"
                key={auction._id}
              >
                <div className="accepted-card-header">
                  <div>
                    <span className="accepted-type-badge">
                      {auction.type === "forward"
                        ? "Forward Auction"
                        : "Reverse Auction"}
                    </span>

                    <h2>{auction.title}</h2>
                  </div>

                  <span className="accepted-status">
                    <span className="accepted-status-dot" />
                    Bid Accepted
                  </span>
                </div>

                <div className="accepted-description">
                  <span className="accepted-field-label">
                    Description
                  </span>
                  <p>
                    {auction.description || "No description available."}
                  </p>
                </div>

                <div className="accepted-amount-panel">
                  <div>
                    <span className="accepted-field-label">
                      Accepted Bid Amount
                    </span>
                    <strong className="accepted-amount">
                      {acceptedBid?.amount != null
                        ? `₹${acceptedBid.amount}`
                        : "Not available"}
                    </strong>
                  </div>

                  <div>
                    <span className="accepted-field-label">
                      Auction Deadline
                    </span>
                    <strong className="accepted-deadline">
                      {auction.deadline
                        ? new Date(auction.deadline).toLocaleString()
                        : "Not available"}
                    </strong>
                  </div>
                </div>

                <div className="accepted-bidder-section">
                  <h3>Selected Bidder Details</h3>

                  <div className="accepted-details-grid">
                    <div className="accepted-detail">
                      <span className="accepted-detail-icon">♙</span>
                      <div>
                        <span className="accepted-field-label">
                          Full Name
                        </span>
                        <p>
                          {bidder?.fullName || "Name not available"}
                        </p>
                      </div>
                    </div>

                    <div className="accepted-detail">
                      <span className="accepted-detail-icon">@</span>
                      <div>
                        <span className="accepted-field-label">
                          Email Address
                        </span>
                        <p>
                          {contact?.winner?.email ||
                            "Contact details unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="accepted-detail">
                      <span className="accepted-detail-icon">☎</span>
                      <div>
                        <span className="accepted-field-label">
                          Phone Number
                        </span>
                        <p>
                          {contact?.winner?.phone ||
                            "Contact details unavailable"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AcceptedBids;
