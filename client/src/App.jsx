
import { Link } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <div className="app">
      {/* Navigation */}
      <header className="navbar">
        <Link to="/" className="brand">
          <span className="brand-icon">⚖</span>
          <span>BidSphere</span>
        </Link>

        <nav className="nav-links">
          <a href="#home">HOME</a>
          <a href="#about">ABOUT</a>
          <a href="#contact">CONTACT</a>
        </nav>

        <div className="nav-actions">
          <Link to="/login" className="login-btn">
            SIGN IN
          </Link>

          <Link to="/register" className="register-btn">
            REGISTER
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">
              YOUR MARKETPLACE, YOUR CHOICE
            </span>

            <h1>
              Every bid creates
              <span> an opportunity.</span>
            </h1>

            <p>
              Buy, sell, and compare offers in one place.
              Discover a smarter way to participate in
              forward and reverse auctions with BidSphere.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="primary-btn">
                GET STARTED
              </Link>

              <a href="#about" className="secondary-btn">
                EXPLORE MARKETPLACE
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-circle"></div>

            <div className="floating-card top-card"></div>

            <div className="auction-card">
              <div className="auction-card-header">
                <span>AUCTION TYPES</span>
                <span className="live-dot">● Live concept</span>
              </div>

              <div className="auction-option">
                <div className="option-icon">↗</div>

                <div>
                  <strong>Forward Auction</strong>
                  <p>Buyers place competitive bids</p>
                </div>

                <span className="option-arrow">→</span>
              </div>

              <div className="auction-option">
                <div className="option-icon reverse-icon">⇄</div>

                <div>
                  <strong>Reverse Auction</strong>
                  <p>Compare providers and offers</p>
                </div>

                <span className="option-arrow">→</span>
              </div>

              <div className="comparison-note">
                <span>✓</span>
                Compare offers before choosing
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="about-section" id="about">
          <div className="section-heading">
            <span className="eyebrow">ONE MARKETPLACE</span>

            <h2>Two ways to make a deal.</h2>

            <p>
              Whether you want to sell a product or find
              the right provider, BidSphere brings the
              entire bidding process together.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">↗</div>

              <h3>Forward Auctions</h3>

              <p>
                Sellers list products, buyers place bids,
                and the seller chooses an eligible winner.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">⇄</div>

              <h3>Reverse Auctions</h3>

              <p>
                Post a product or service requirement,
                compare provider offers, and select your
                preferred eligible bidder.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">✓</div>

              <h3>Informed Decisions</h3>

              <p>
                Review prices, delivery times, and proposal
                details before choosing the right offer.
              </p>
            </article>
          </div>
        </section>

        {/* Contact / Call-to-Action Section */}
        <section className="contact-section" id="contact">
          <span className="eyebrow">LET'S GET STARTED</span>

          <h2>Ready to explore a better way to bid?</h2>

          <p>
            Create an account to explore auctions and
            participate in the marketplace.
          </p>

          <Link to="/register" className="primary-btn">
            CREATE YOUR ACCOUNT
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <Link to="/" className="brand footer-brand">
          <span className="brand-icon">⚖</span>
          <span>BidSphere</span>
        </Link>

        <p>Unified Forward &amp; Reverse Auction Marketplace</p>

        <span>© 2026 BidSphere</span>
      </footer>
    </div>
  );
}

export default App;
