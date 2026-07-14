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

  return (
    <nav className={`navbar ${isLanding ? 'navbar-landing' : ''}`}>
      <Link href="/" className="navbar-brand">
        VaultAI
      </Link>

      <div className="navbar-nav">
        {session ? (
          <>
            <Link href="/vault" className={pathname === '/vault' ? 'active' : ''}>
              🗄️ Vault
            </Link>

            <div className="navbar-user">
              <div className="navbar-avatar" style={{ background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
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
                <div style={{ display: 'flex', gap: '24px', marginRight: 'auto', marginLeft: '32px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                  <span style={{ cursor: 'pointer' }}>Features</span>
                  <span style={{ cursor: 'pointer' }}>Security</span>
                  <span style={{ cursor: 'pointer' }}>Pricing</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <Link href="/auth/login" style={{ fontSize: '14px', fontWeight: 500 }}>Sign In</Link>
                  <Link href="/auth/register" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '9999px' }}>
                    Get Started
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
