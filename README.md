# 🔐 VaultAI — AI-Powered Password Manager

> **A zero-knowledge, end-to-end encrypted password manager with Google Gemini AI integration.**

Built with Next.js 15, Prisma + SQLite, and AES-256-GCM client-side encryption. The server never sees your plaintext passwords.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-5-blue?logo=prisma)
![Gemini AI](https://img.shields.io/badge/Google_Gemini-AI-red?logo=google)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🔐 Security
- **Zero-Knowledge Architecture** — All encryption/decryption happens in your browser using Web Crypto API
- **AES-256-GCM** encryption with **PBKDF2** key derivation (100,000 iterations)
- Server only stores encrypted ciphertext — it can never read your passwords
- Auto-lock after inactivity

### 🤖 AI Integration (Google Gemini)
- **AI Security Audit** — Analyzes vault health without accessing actual passwords
- **Smart Password Analysis** — AI-powered recommendations for password improvement
- **AI Security Assistant** — Chat with an AI about password security best practices
- **Contextual Suggestions** — AI tips based on account type

### 🎨 Premium UI
- Dark glassmorphism design with gradient accents
- Smooth animations and micro-interactions
- Responsive design (mobile, tablet, desktop)
- Toast notifications, skeleton loading, password strength meter

### 🛠 Core Features
- Full CRUD for credentials (add, edit, delete, search, filter)
- Password generator with configurable options
- Category management (Social, Banking, Work, etc.)
- Favorites system with one-click copy

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd vaultai

# Install dependencies
npm install

# Set up the database
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY=""  # Get free key from aistudio.google.com
```

> **Note:** AI features work without a Gemini API key (uses built-in heuristics), but adding a key unlocks the full AI experience.

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | SQLite + Prisma ORM |
| Auth | NextAuth.js (Credentials + JWT) |
| Encryption | Web Crypto API (AES-256-GCM + PBKDF2) |
| AI | Google Gemini API |
| Styling | Vanilla CSS (Custom Design System) |

## 📁 Architecture

```
src/
├── app/
│   ├── api/          # REST API routes
│   │   ├── auth/     # NextAuth + Registration
│   │   ├── credentials/  # CRUD operations
│   │   └── ai/       # Gemini AI endpoints
│   ├── auth/         # Login & Register pages
│   ├── vault/        # Vault dashboard & AI Hub
│   ├── globals.css   # Design system
│   └── layout.js     # Root layout
├── components/       # Reusable UI components
└── lib/              # Core utilities
    ├── auth.js       # NextAuth configuration
    ├── crypto.js     # Client-side encryption
    ├── gemini.js     # Gemini AI service
    └── prisma.js     # Database client
```

## 🔒 Security Model

```
User's Browser                    Server
    │                               │
    │  Master Password              │
    │       ↓                       │
    │  PBKDF2 (100K iter)           │
    │       ↓                       │
    │  AES-256-GCM Key              │
    │       ↓                       │
    │  Encrypt Data                 │
    │       ↓                       │
    │  Encrypted Blob ──────────►   │  Store Blob
    │                               │  (can't decrypt)
    │  ◄────────────── Fetch Blob   │
    │       ↓                       │
    │  Decrypt Data                 │
    │       ↓                       │
    │  Plaintext                    │
```

## 📝 License

MIT License — feel free to use this for your portfolio!

---

**Built with ❤️ by [Your Name]**
