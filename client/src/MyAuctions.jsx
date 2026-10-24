
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./MyAuctions.css";

function MyAuctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchMyAuctions = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          setError("Please log in to view your auctions.");
          return;
        }

        const response = await axios.get(
          "http://localhost:5001/api/auctions/my-auctions",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const auctionData = Array.isArray(response.data)
          ? response.data
          : response.data.auctions || [];

        setAuctions(auctionData);
      } catch (err) {
        console.error(
          "My Auctions error:",
          err.response?.status,
          err.response?.data || err.message
        );

        if (err.response?.status === 401) {
          setError(
            "Your session is invalid or expired. Please log in again."
          );
        } else if (err.response?.status === 404) {
          setError(
            "My Auctions API was not found. Please check the backend route."
          );
        } else {
          setError(
            err.response?.data?.message ||
              "Unable to load auctions. Please try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMyAuctions();
  }, []);

  const handleDelete = async (auctionId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this auction?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(auctionId);

      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please log in to delete an auction.");
        return;
      }

      await axios.delete(
        `http://localhost:5001/api/auctions/${auctionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAuctions((currentAuctions) =>
        currentAuctions.filter(
          (auction) => auction._id !== auctionId
        )
      );

      alert("Auction deleted successfully!");
    } catch (err) {
      console.error(
        "Delete auction error:",
        err.response?.data || err.message
      );

      alert(
        err.response?.data?.message ||
          "Unable to delete auction. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="my-auctions-container">
        <h2>My Auctions</h2>
        <p className="auctions-message">Loading your auctions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-auctions-container">
        <h2>My Auctions</h2>

        <p className="auctions-error">{error}</p>

        <button
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>

        <p className="dashboard-link">
          <Link to="/dashboard">Back to Dashboard</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="my-auctions-container">
      <div className="my-auctions-header">
        <div>
          <p className="auctions-eyebrow">YOUR MARKETPLACE</p>
          <h2>My Auctions</h2>
          <p className="auctions-subtitle">
            Manage your auctions, review bids, and remove listings.
          </p>
        </div>

        <Link to="/create-auction" className="create-auction-link">
          + Create New Auction
        </Link>
      </div>

      <div className="auctions-count">
        Total auctions: <strong>{auctions.length}</strong>
      </div>

      {auctions.length === 0 ? (
        <div className="auctions-empty">
          <h3>No auctions yet</h3>
          <p>You have not created any auctions. Create one to get started.</p>
          <Link to="/create-auction" className="create-auction-link">
            Create Your First Auction
          </Link>
        </div>
      ) : (
        <div className="auctions-list">
          {auctions.map((auction) => (
            <div key={auction._id} className="auction-card">
              <div className="auction-card-top">
                <span
                  className={`auction-type ${
                    auction.type === "forward"
                      ? "forward-type"
                      : "reverse-type"
                  }`}
                >
                  {auction.type === "forward"
                    ? "Forward Auction"
                    : "Reverse Auction"}
                </span>

                <span className="auction-status">Your listing</span>
              </div>

              <h3>{auction.title}</h3>

              <p className="auction-description">
                {auction.description || "No description provided."}
              </p>

              <div className="auction-information">
                <div className="auction-info-item">
                  <span>Amount</span>
                  <strong>
                    {Number(auction.amount || 0).toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </div>

                <div className="auction-info-item">
                  <span>Deadline</span>
                  <strong>
                    {auction.deadline
                      ? new Date(auction.deadline).toLocaleString()
                      : "Not specified"}
                  </strong>
                </div>

                <div className="auction-info-item">
                  <span>Created</span>
                  <strong>
                    {auction.createdAt
                      ? new Date(auction.createdAt).toLocaleDateString()
                      : "Not available"}
                  </strong>
                </div>
              </div>

              <div className="auction-card-actions">
                <Link
                  to={`/auction-bids/${auction._id}`}
                  className="view-bids-button"
                >
                  View Bids
                </Link>

                <button
                  type="button"
                  className="delete-auction-button"
                  onClick={() => handleDelete(auction._id)}
                  disabled={deletingId === auction._id}
                >
                  {deletingId === auction._id
                    ? "Deleting..."
                    : "Delete Auction"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyAuctions;
