'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAuthPage = pathname?.startsWith('/auth');
  const isLanding = pathname === '/';

  if (isAuthPage) return null;

  const getInitials = (name, email) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand">
        <div className="logo-icon">🔐</div>
        VaultAI
        <span className="ai-badge">AI</span>
      </Link>

      <div className="navbar-nav">
        {session ? (
          <>
            <Link href="/vault" className={pathname === '/vault' ? 'active' : ''}>
              🗄️ Vault
            </Link>
            <Link href="/vault/ai" className={pathname === '/vault/ai' ? 'active' : ''}>
              🤖 AI Hub
            </Link>
            <div className="navbar-user">
              <div className="navbar-avatar">
                {getInitials(session.user?.name, session.user?.email)}
              </div>
              <button onClick={() => signOut({ callbackUrl: '/' })}>
                Sign Out
              </button>
            </div>
          </>
        ) : (
          <>
            {isLanding && (
              <>
                <Link href="/auth/login">Sign In</Link>
                <Link href="/auth/register" className="btn btn-primary btn-sm">
                  Get Started
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
