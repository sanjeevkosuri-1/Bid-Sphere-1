
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./Profile.css";
const API_URL = "https://bid-sphere-backend-rgys.onrender.com/api/auth/profile";

const emptyProfile = {
  fullName: "",
  email: "",
  phone: "",
};

function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(emptyProfile);
  const [formData, setFormData] = useState(emptyProfile);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in to view your profile.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const user = {
          fullName: response.data.user.fullName || "",
          email: response.data.user.email || "",
          phone: response.data.user.phone || "",
        };

        setProfile(user);
        setFormData(user);

        // Keep the saved user information synchronized.
        const storedUser = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...storedUser,
            ...response.data.user,
            id: response.data.user._id || storedUser.id,
          })
        );
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load your profile. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleEdit() {
    setFormData(profile);
    setIsEditing(true);
    setMessage("");
    setError("");
  }

  function handleCancel() {
    setFormData(profile);
    setIsEditing(false);
    setMessage("");
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in again to update your profile.");
      return;
    }

    if (
      !formData.fullName.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim()
    ) {
      setError("Please fill in all profile fields.");
      return;
    }

    try {
      setSaving(true);

      const response = await axios.put(
        API_URL,
        {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUser = {
        fullName: response.data.user.fullName,
        email: response.data.user.email,
        phone: response.data.user.phone,
      };

      setProfile(updatedUser);
      setFormData(updatedUser);
      setIsEditing(false);

      // Update local user information without changing the token.
      const storedUser = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          ...response.data.user,
          id: response.data.user._id || storedUser.id,
        })
      );

      setMessage(
        response.data.message || "Profile updated successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <p className="profile-subtitle">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <nav className="profile-navbar">
        <Link to="/" className="profile-logo">
          BidSphere
        </Link>

        <Link to="/dashboard" className="back-link">
          Dashboard
        </Link>
      </nav>

      <main className="profile-container">
        <h1>My Profile</h1>

        <p className="profile-subtitle">
          Manage your personal information
        </p>

        <section className="profile-card">
          <div className="profile-avatar">
            {profile.fullName
              ? profile.fullName.charAt(0).toUpperCase()
              : "U"}
          </div>

          <h2>{profile.fullName || "Your Name"}</h2>
          <p>{profile.email || "Your email address"}</p>

          {message && (
            <p className="profile-success" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="profile-error" role="alert">
              {error}
            </p>
          )}

          {!isEditing ? (
            <>
              <div className="profile-details">
                <div className="profile-field">
                  <label>Full Name</label>
                  <p>{profile.fullName || "Not provided"}</p>
                </div>

                <div className="profile-field">
                  <label>Email Address</label>
                  <p>{profile.email || "Not provided"}</p>
                </div>

                <div className="profile-field">
                  <label>Phone Number</label>
                  <p>{profile.phone || "Not provided"}</p>
                </div>
              </div>

              <button
                type="button"
                className="profile-button"
                onClick={handleEdit}
              >
                Edit Profile
              </button>
            </>
          ) : (
            <form onSubmit={handleSave}>
              <div className="profile-form">
                <label>
                  Full Name
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    maxLength={100}
                  />
                </label>

                <label>
                  Email Address
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    maxLength={20}
                  />
                </label>
              </div>

              <div className="profile-actions">
                <button
                  type="submit"
                  className="profile-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  className="profile-cancel"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

export default Profile;
