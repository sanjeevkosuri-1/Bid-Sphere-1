
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./BrowseAuctions.css";

function BrowseAuctions() {
  const [auctions, setAuctions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [auctionType, setAuctionType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
         "https://bid-sphere-backend-rgys.onrender.com/api/auctions"
        );

        const auctionData = Array.isArray(response.data)
          ? response.data
          : response.data.auctions || [];

        setAuctions(auctionData);
      } catch (err) {
        console.error("Error fetching auctions:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load auctions. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, []);

  // Search by title or description and filter by auction type
  const filteredAuctions = auctions.filter((auction) => {
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      (auction.title || "").toLowerCase().includes(search) ||
      (auction.description || "").toLowerCase().includes(search);

    const matchesType =
      auctionType === "all" || auction.type === auctionType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="browse-auctions-page">
      <nav className="browse-nav">
        <h2>BidSphere</h2>

        <Link to="/dashboard">
          Back to Dashboard
        </Link>
      </nav>

      <main className="browse-content">
        <h1>Browse Auctions</h1>

        <p>
          Explore available forward and reverse auctions.
        </p>

        {/* Search and filter section */}
        <div className="auction-search-section">
          <input
            type="text"
            placeholder="Search by auction title or description..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search auctions"
          />

          <select
            value={auctionType}
            onChange={(event) => setAuctionType(event.target.value)}
            aria-label="Filter by auction type"
          >
            <option value="all">All Auction Types</option>
            <option value="forward">Forward Auctions</option>
            <option value="reverse">Reverse Auctions</option>
          </select>

          {(searchTerm || auctionType !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setAuctionType("all");
              }}
            >
              Clear Search
            </button>
          )}
        </div>

        {loading && <p>Loading auctions...</p>}

        {error && (
          <div className="browse-error">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && auctions.length === 0 && (
          <p>
            No auctions available yet. Create your first auction!
          </p>
        )}

        {!loading && !error && auctions.length > 0 && (
          <>
            <p>
              Showing {filteredAuctions.length} of {auctions.length} auctions
            </p>

            {filteredAuctions.length === 0 ? (
              <p>
                No matching auctions found. Try another search.
              </p>
            ) : (
              <div className="auction-list">
                {filteredAuctions.map((auction) => (
                  <div
                    className="auction-item"
                    key={auction._id}
                  >
                    <span className="auction-type">
                      {auction.type === "forward"
                        ? "Forward Auction"
                        : "Reverse Auction"}
                    </span>

                    <h3>{auction.title}</h3>

                    <p>{auction.description}</p>

                    <p>
                      <strong>
                        {auction.type === "forward"
                          ? "Starting Price:"
                          : "Maximum Budget:"}
                      </strong>{" "}
                      ₹{Number(auction.amount).toLocaleString("en-IN")}
                    </p>

                    <p>
                      <strong>Deadline:</strong>{" "}
                      {auction.deadline
                        ? new Date(auction.deadline).toLocaleString("en-IN")
                        : "Not specified"}
                    </p>

                    <p className="auction-id">
                      Auction ID: {auction._id}
                    </p>

                    <Link
                      to={`/auction/${auction._id}`}
                      className="view-auction-button"
                    >
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default BrowseAuctions;
