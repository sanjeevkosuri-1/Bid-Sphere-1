
import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";

import App from "./App.jsx";
import MyAuctions from "./MyAuctions.jsx";
import Dashboard from "./Dashboard.jsx";
import CreateAuction from "./CreateAuction.jsx";
import BrowseAuctions from "./BrowseAuctions.jsx";
import Register from "./Register.jsx";
import Login from "./Login.jsx";
import ForgotPassword from "./ForgotPassword.jsx";
import AuctionDetails from "./AuctionDetails.jsx";
import Profile from "./Profile.jsx";
import MyBids from "./MyBids.jsx";
import AuctionBids from "./AuctionBids.jsx";
import AcceptedBids from "./AcceptedBids.jsx";

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <h1>{title}</h1>
      <p>
        This page will be implemented in the frontend development phase.
      </p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        {/* Forgot Password */}
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/create-auction"
          element={<CreateAuction />}
        />

        <Route
          path="/browse-auctions"
          element={<BrowseAuctions />}
        />

        <Route
          path="/auction/:id"
          element={<AuctionDetails />}
        />

        <Route
          path="/my-auctions"
          element={<MyAuctions />}
        />

        <Route
          path="/my-bids"
          element={<MyBids />}
        />

        <Route
          path="/accepted-bids"
          element={<AcceptedBids />}
        />

        <Route
          path="/auction-bids/:id"
          element={<AuctionBids />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/about"
          element={<PlaceholderPage title="About BidSphere" />}
        />

        <Route
          path="/contact"
          element={<PlaceholderPage title="Contact Us" />}
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
