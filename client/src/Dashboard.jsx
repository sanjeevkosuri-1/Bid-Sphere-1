
import React from "react";
import { NavLink, Link } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <nav className="dashboard-nav">
        <h2>BidSphere</h2>

        <Link to="/" className="dashboard-home-link">
          Home
        </Link>
      </nav>

      <div className="dashboard-layout">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              <span>BS</span>
            </div>
            <div>
              <h3>My Workspace</h3>
              <p>Manage your bidding</p>
            </div>
          </div>

          <p className="sidebar-heading">MAIN MENU</p>

          <nav className="sidebar-menu">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">⌂</span>
              Dashboard
            </NavLink>

            <NavLink
              to="/browse-auctions"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">⌕</span>
              Browse Auctions
            </NavLink>

            <NavLink
              to="/create-auction"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">＋</span>
              Create Bid
            </NavLink>

            <NavLink
              to="/my-auctions"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">▤</span>
              My Auctions
            </NavLink>

            <NavLink
              to="/my-bids"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">⇄</span>
              My Bids
            </NavLink>

            <NavLink
              to="/accepted-bids"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">✓</span>
              Accepted Bids
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">♙</span>
              My Profile
            </NavLink>
          </nav>
        </aside>

        {/* Main Dashboard Content */}
        <main className="dashboard-main">
          <section className="dashboard-welcome">
            <p className="welcome-label">YOUR DASHBOARD</p>
            <h1>Welcome to BidSphere!</h1>
            <p>
              Manage your auctions, explore opportunities, and
              connect with buyers and sellers in one place.
            </p>
          </section>

          {/* Create Bid Card in the Center */}
          <section className="create-bid-section">
            <div className="create-bid-card">
              <div className="create-bid-icon">＋</div>

              <h2>Create Bid</h2>

              <p>
                Start a new auction to sell a product or post a
                requirement and receive bids from other users.
              </p>

              <Link
                to="/create-auction"
                className="create-bid-button"
              >
                Create Now <span>→</span>
              </Link>
            </div>
          </section>

          <footer className="dashboard-footer">
            BidSphere — Your Auction Marketplace
          </footer>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
