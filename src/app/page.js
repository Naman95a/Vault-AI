import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="landing">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-badge">
          <span className="dot"></span>
          Zero-Knowledge Encrypted • AI-Powered
        </div>

        <h1>
          Your Passwords,{' '}
          <span className="gradient-text">Fortified by AI</span>
        </h1>

        <p>
          VaultAI combines military-grade AES-256 encryption with intelligent
          security analysis. Your passwords are encrypted before they leave your
          browser — not even we can see them.
        </p>

        <div className="hero-actions">
          <Link href="/auth/register" className="btn btn-primary btn-lg">
            🚀 Get Started Free
          </Link>
          <Link href="/auth/login" className="btn btn-secondary btn-lg">
            Sign In →
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>
          Why <span className="text-gradient">VaultAI</span>?
        </h2>
        <p className="subtitle">
          Built with security-first architecture and enhanced with artificial
          intelligence for proactive protection.
        </p>

        <div className="features-grid stagger-children">
          <div className="glass-card feature-card">
            <div className="feature-icon purple">🔐</div>
            <h3>Zero-Knowledge Encryption</h3>
            <p>
              AES-256-GCM encryption with PBKDF2 key derivation happens entirely
              in your browser. The server only stores encrypted blobs — it can
              never read your passwords.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon cyan">🤖</div>
            <h3>AI Security Audits</h3>
            <p>
              Powered by Google Gemini, get intelligent analysis of your vault
              health — identifying weak passwords, reuse patterns, and aging
              credentials automatically.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon green">🛡️</div>
            <h3>Smart Password Generator</h3>
            <p>
              Generate cryptographically secure passwords with configurable
              options. AI suggests context-aware password strategies based on
              account type.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon orange">💬</div>
            <h3>AI Security Assistant</h3>
            <p>
              Chat with an AI security expert about best practices, phishing
              protection, two-factor authentication, and more — right inside your
              vault.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon pink">⚡</div>
            <h3>Lightning Fast</h3>
            <p>
              Built with Next.js for blazing-fast page loads. One-click copy,
              instant search, and smooth animations make managing passwords
              effortless.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon blue">📱</div>
            <h3>Responsive Design</h3>
            <p>
              Access your vault from any device. The premium glassmorphism
              interface adapts beautifully to desktop, tablet, and mobile
              screens.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        style={{
          textAlign: 'center',
          padding: '80px 24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>
          Ready to secure your digital life?
        </h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            marginBottom: '32px',
            fontSize: '16px',
          }}
        >
          Create your free encrypted vault in seconds.
        </p>
        <Link href="/auth/register" className="btn btn-primary btn-lg">
          Create Free Account →
        </Link>
      </section>
    </div>
  );
}
