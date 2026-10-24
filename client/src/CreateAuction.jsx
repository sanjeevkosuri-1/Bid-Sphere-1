import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CreateAuction.css";

const API_URL = "http://localhost:5001/api";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function CreateAuction() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "forward",
    amount: "",
  });

  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    setError("");
    setMessage("");

    if (selectedFiles.length > MAX_FILES) {
      setAttachments([]);
      event.target.value = "";
      setError("You can upload a maximum of 5 files.");
      return;
    }

    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setAttachments([]);
        event.target.value = "";
        setError("Only JPG, PNG, WebP images and PDF files are allowed.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setAttachments([]);
        event.target.value = "";
        setError("Each file must be 5 MB or smaller.");
        return;
      }
    }

    setAttachments(selectedFiles);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.type ||
      formData.amount === ""
    ) {
      setError("Please provide all required auction details.");
      return;
    }

    if (
      !Number.isFinite(Number(formData.amount)) ||
      Number(formData.amount) < 1
    ) {
      setError("Amount must be at least 1.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in before creating an auction.");
      return;
    }

    const data = new FormData();

    data.append("title", formData.title.trim());
    data.append("description", formData.description.trim());
    data.append("type", formData.type);
    data.append("amount", String(Number(formData.amount)));

    attachments.forEach((file) => {
      data.append("attachments", file);
    });

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/auctions`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(
        response.data.message ||
          "Auction created successfully. It expires after 10 days."
      );

      setFormData({
        title: "",
        description: "",
        type: "forward",
        amount: "",
      });

      setAttachments([]);

      event.target.reset();

      setTimeout(() => {
        navigate("/my-auctions");
      }, 1000);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to create auction. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-auction-container">
      <h2>Create Auction</h2>

      <form
        className="create-auction-form"
        onSubmit={handleSubmit}
      >
        <div className="form-group">
          <label htmlFor="title">Auction Title</label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            required
            maxLength={150}
            placeholder="Enter auction title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={5}
            maxLength={5000}
            placeholder="Describe your product or requirement"
          />
        </div>

        <div className="form-group">
          <label htmlFor="type">Auction Type</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value="forward">Forward Auction</option>
            <option value="reverse">Reverse Auction</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="amount">Starting Amount (₹)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min="1"
            step="0.01"
            value={formData.amount}
            onChange={handleChange}
            required
            placeholder="Enter starting amount"
          />
        </div>

        <div className="form-group">
          <label htmlFor="attachments">
            Product Images or PDF (Optional)
          </label>

          <input
            id="attachments"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleFileChange}
          />

          <small>
            Maximum 5 files, 5 MB each. Accepted formats: JPG, PNG,
            WebP and text-based PDF. Do not upload confidential
            information.
          </small>

          {attachments.length > 0 && (
            <ul>
              {attachments.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  {file.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="auction-expiry-note">
          Your auction will automatically expire and be deleted
          after 10 days, whether or not a bid has been accepted.
        </p>

        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Creating Auction..." : "Create Auction"}
        </button>
      </form>
    </div>
  );
}

export default CreateAuction;