import Link from 'next/link';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="landing" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '100px', position: 'relative', overflow: 'hidden' }}>
      {/* Developer Grid Background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(39,39,42,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,39,42,0.5) 1px, transparent 1px)', backgroundSize: '48px 48px', WebkitMaskImage: 'linear-gradient(to bottom, black 10%, transparent 80%)', maskImage: 'linear-gradient(to bottom, black 10%, transparent 80%)', zIndex: 0, opacity: 0.6 }}></div>

      {/* Ambient Glow */}
      <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(17,17,19,0) 60%)', pointerEvents: 'none', zIndex: 0 }}></div>

      <section className="hero" style={{ padding: '40px 20px', textAlign: 'center', width: '100%', position: 'relative', zIndex: 1, maxWidth: '1200px' }}>
        
        <h1 style={{ fontSize: 'clamp(56px, 8vw, 88px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '24px', margin: '0 auto 40px auto' }}>
          Secure. Analyze.<br />
          <span style={{ background: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>Automate.</span>
        </h1>

        <div className="hero-actions" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          {session ? (
            <Link href="/vault" className="btn btn-primary btn-lg" style={{ padding: '14px 32px', fontSize: '15px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
              Go to Vault
            </Link>
          ) : (
            <Link href="/auth/register" className="btn btn-primary btn-lg" style={{ padding: '14px 32px', fontSize: '15px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"></path></svg>
              Get Started
            </Link>
          )}
        </div>

      </section>
    </div>
  );
}
