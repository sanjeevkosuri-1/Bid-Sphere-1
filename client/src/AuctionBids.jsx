
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import "./AuctionBids.css";

const API_URL = "http://localhost:5001/api";

function AuctionBids() {
  const { id } = useParams();

  const [bids, setBids] = useState([]);
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptingId, setAcceptingId] = useState(null);
  const [message, setMessage] = useState("");
  const [profiles, setProfiles] = useState({});
  const [loadingProfileId, setLoadingProfileId] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const token = localStorage.getItem("token");

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // Fetch bids and load the auction details.
  const fetchBids = async () => {
    const response = await axios.get(
      `${API_URL}/bids/${id}`,
      authHeaders
    );

    const receivedBids = Array.isArray(response.data)
      ? response.data
      : response.data.bids || [];

    setBids(receivedBids);

    // Load each bidder's profile, including phone during bidding.
    await Promise.all(
      receivedBids.map(async (bid) => {
        const bidderId =
          typeof bid.bidder === "object"
            ? bid.bidder?._id
            : bid.bidder;

        if (!bidderId) return;

        try {
          const profileResponse = await axios.get(
            `${API_URL}/bids/${id}/profile/${bidderId}`,
            authHeaders
          );

          setProfiles((previous) => ({
            ...previous,
            [bidderId]: profileResponse.data,
          }));
        } catch (err) {
          console.error(
            `Could not load bidder ${bidderId}:`,
            err.response?.data?.message || err.message
          );
        }
      })
    );
  };

  const fetchAuction = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/auctions/${id}`,
        authHeaders
      );

      setAuction(response.data.auction || response.data);
    } catch (err) {
      console.error(
        "Fetch auction details error:",
        err.response?.data?.message || err.message
      );
    }
  };

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);

      const response = await axios.get(
        `${API_URL}/bids/${id}/contact`,
        authHeaders
      );

      setContacts(response.data);
    } catch (err) {
      setContacts(null);
      console.error(
        "Fetch contact details error:",
        err.response?.data?.message || err.message
      );
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    const loadPage = async () => {
      if (!token) {
        setError("Please log in to view bids.");
        setLoading(false);
        return;
      }

      try {
        setError("");
        await Promise.all([fetchBids(), fetchAuction()]);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load bids. Only the auction creator can view them."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (auction?.acceptedBid) {
      fetchContacts();
    } else {
      setContacts(null);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.acceptedBid, id]);

  // Accept a bid and refresh the page data.
  const handleAcceptBid = async (bidId) => {
    const confirmed = window.confirm(
      "Are you sure you want to accept this bid? You cannot select another bid afterward."
    );

    if (!confirmed) return;

    try {
      setAcceptingId(bidId);
      setError("");
      setMessage("");

      const response = await axios.post(
        `${API_URL}/bids/${id}/accept/${bidId}`,
        {},
        authHeaders
      );

      setMessage(
        response.data.message || "Bid accepted successfully!"
      );

      await Promise.all([fetchBids(), fetchAuction()]);
      await fetchContacts();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to accept this bid. Please try again."
      );
    } finally {
      setAcceptingId(null);
    }
  };

  // Refresh a bidder's profile if needed.
  const handleViewProfile = async (userId) => {
    try {
      setLoadingProfileId(userId);

      const response = await axios.get(
        `${API_URL}/bids/${id}/profile/${userId}`,
        authHeaders
      );

      setProfiles((previous) => ({
        ...previous,
        [userId]: response.data,
      }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load this bidder's profile."
      );
    } finally {
      setLoadingProfileId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "30px" }}>
        <h2>Auction Bids</h2>
        <p>Loading bids and bidder profiles...</p>
      </div>
    );
  }

  if (error && bids.length === 0) {
    return (
      <div style={{ padding: "30px" }}>
        <h2>Auction Bids</h2>
        <p style={{ color: "red" }}>{error}</p>
        <Link to="/my-auctions">Back to My Auctions</Link>
      </div>
    );
  }

  const acceptedBidId =
    auction?.acceptedBid?._id || auction?.acceptedBid || null;

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "900px",
        margin: "auto",
      }}
    >
      <h2>Auction Bids</h2>

      {message && (
        <p style={{ color: "green", fontWeight: "bold" }}>
          {message}
        </p>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {acceptedBidId && (
        <div
          style={{
            backgroundColor: "#dcfce7",
            color: "#166534",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <h3>Bid Accepted</h3>
          <p>A winner has been selected for this auction.</p>
        </div>
      )}

      <p>
        <strong>Total bids received:</strong> {bids.length}
      </p>

      {bids.length === 0 ? (
        <p>No bids have been received for this auction yet.</p>
      ) : (
        bids.map((bid) => {
          const bidderId =
            typeof bid.bidder === "object"
              ? bid.bidder?._id
              : bid.bidder;

          const profile = bidderId ? profiles[bidderId] : null;

          const bidderName =
            profile?.fullName ||
            (typeof bid.bidder === "object"
              ? bid.bidder?.fullName
              : null) ||
            "Unknown bidder";

          const isAccepted =
            acceptedBidId &&
            String(acceptedBidId) === String(bid._id);

          return (
            <div
              key={bid._id}
              style={{
                border: isAccepted
                  ? "2px solid #16a34a"
                  : "1px solid #ddd",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "15px",
              }}
            >
              <h3>Bidder: {bidderName}</h3>

              <p>
                <strong>Phone:</strong>{" "}
                {profile?.phone || "Loading phone number..."}
              </p>

              {profile?.email && (
                <p>
                  <strong>Email:</strong> {profile.email}
                </p>
              )}

              {bidderId && (
                <button
                  onClick={() => handleViewProfile(bidderId)}
                  disabled={loadingProfileId === bidderId}
                  style={{
                    padding: "7px 12px",
                    marginBottom: "10px",
                    cursor: "pointer",
                  }}
                >
                  {loadingProfileId === bidderId
                    ? "Refreshing..."
                    : "Refresh Profile"}
                </button>
              )}

              <p>
                <strong>Bid amount:</strong>{" "}
                {Number(bid.amount).toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 2,
                })}
              </p>

              <p>
                <strong>Submitted:</strong>{" "}
                {bid.createdAt
                  ? new Date(bid.createdAt).toLocaleString()
                  : "Not available"}
              </p>

              {isAccepted ? (
                <p style={{ color: "#15803d", fontWeight: "bold" }}>
                  ✓ Accepted Bid
                </p>
              ) : acceptedBidId ? (
                <p style={{ color: "#666" }}>
                  Another bid has already been accepted.
                </p>
              ) : (
                <button
                  onClick={() => handleAcceptBid(bid._id)}
                  disabled={acceptingId !== null}
                  style={{
                    backgroundColor:
                      acceptingId === bid._id
                        ? "#999"
                        : "#166534",
                    color: "white",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "6px",
                    cursor:
                      acceptingId !== null
                        ? "not-allowed"
                        : "pointer",
                    marginTop: "8px",
                  }}
                >
                  {acceptingId === bid._id
                    ? "Accepting..."
                    : "Accept Bid"}
                </button>
              )}
            </div>
          );
        })
      )}

      {acceptedBidId && (
        <div
          style={{
            border: "1px solid #16a34a",
            borderRadius: "8px",
            padding: "18px",
            marginTop: "20px",
          }}
        >
          <h3>Accepted Bid Contact Details</h3>

          {loadingContacts ? (
            <p>Loading contact details...</p>
          ) : contacts ? (
            <>
              <h4>Selected Bidder</h4>
              <p>
                <strong>Name:</strong>{" "}
                {contacts.winner?.fullName || "Not available"}
              </p>
              <p>
                <strong>Phone:</strong>{" "}
                {contacts.winner?.phone || "Not available"}
              </p>
              <p>
                <strong>Email:</strong>{" "}
                {contacts.winner?.email || "Not available"}
              </p>

              <h4>Auction Creator</h4>
              <p>
                <strong>Name:</strong>{" "}
                {contacts.creator?.fullName || "Not available"}
              </p>
              <p>
                <strong>Phone:</strong>{" "}
                {contacts.creator?.phone || "Not available"}
              </p>
              <p>
                <strong>Email:</strong>{" "}
                {contacts.creator?.email || "Not available"}
              </p>
            </>
          ) : (
            <p>
              Contact details could not be loaded. Refresh and try again.
            </p>
          )}
        </div>
      )}

      <Link to="/my-auctions">
        <button
          style={{
            padding: "10px 16px",
            marginTop: "20px",
          }}
        >
          Back to My Auctions
        </button>
      </Link>
    </div>
  );
}

export default AuctionBids;
