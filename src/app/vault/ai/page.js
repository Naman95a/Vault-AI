'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { deriveKey, decryptData, encryptData, analyzePasswordStrength, generatePassword } from '@/lib/crypto';
import { useToast } from '@/components/ToastProvider';

export default function AIHubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();

  const [cryptoKey, setCryptoKey] = useState(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hi! I'm VaultAI's security assistant. Ask me anything about password security, phishing protection, or cybersecurity best practices. 🛡️" },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Unlock vault
  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!masterPassword) return;
    setUnlocking(true);
    try {
      const key = await deriveKey(masterPassword, session.user.masterSalt);
      setCryptoKey(key);
      toast.success('Vault Unlocked', 'AI features are now available');
    } catch {
      toast.error('Unlock Failed', 'Invalid master password');
    } finally {
      setUnlocking(false);
      setMasterPassword('');
    }
  };

  // Run security analysis
  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      // Fetch credentials
      const res = await fetch('/api/credentials');
      const data = await res.json();
      const credentials = data.credentials || [];

      if (credentials.length === 0) {
        toast.warning('Empty Vault', 'Add some credentials first to run analysis');
        setAnalyzing(false);
        return;
      }

      // Decrypt and build metadata (without sending actual passwords)
      const strengths = [];
      const lengths = [];
      const categories = {};
      let oldCount = 0;
      const strengthMap = {};

      for (const cred of credentials) {
        try {
          const decrypted = await decryptData(cred.encryptedData, cred.iv, cryptoKey);
          const s = analyzePasswordStrength(decrypted.password);
          strengths.push(s.score);
          lengths.push(decrypted.password?.length || 0);
          categories[cred.category] = (categories[cred.category] || 0) + 1;

          // Check for similar strength patterns (proxy for reuse)
          const key = `${s.score}-${decrypted.password?.length}`;
          strengthMap[key] = (strengthMap[key] || 0) + 1;

          // Check age
          const age = Date.now() - new Date(cred.updatedAt).getTime();
          if (age > 90 * 24 * 60 * 60 * 1000) oldCount++;
        } catch {
          // skip failed decryption
        }
      }

      const duplicatePatterns = Object.values(strengthMap).filter((v) => v > 1).length;
      const avgScore = strengths.length > 0 ? Math.round(strengths.reduce((a, b) => a + b, 0) / strengths.length) : 0;

      const lengthDistribution = {
        short: lengths.filter((l) => l < 8).length,
        medium: lengths.filter((l) => l >= 8 && l < 12).length,
        good: lengths.filter((l) => l >= 12 && l < 16).length,
        excellent: lengths.filter((l) => l >= 16).length,
      };

      const diversityScores = strengths;

      // Send metadata to AI for analysis
      const aiRes = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalCredentials: credentials.length,
          lengthDistribution,
          diversityScores,
          avgStrengthScore: avgScore,
          oldPasswords: oldCount,
          duplicatePatterns,
          categories,
        }),
      });

      const aiData = await aiRes.json();
      setAnalysis(aiData.analysis);
      toast.success('Analysis Complete', 'Your vault security report is ready');
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error('Analysis Failed', 'Could not complete security analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  // Chat with AI
  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: chatMessages.slice(1), // skip welcome message
        }),
      });

      const data = await res.json();
      let responseText = data.response;
      
      // Parse potential action block
      const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const actionData = JSON.parse(jsonMatch[1]);
          if (actionData.action === 'ADD_CREDENTIAL' && actionData.name) {
            // Strip the JSON block from the response shown to the user
            responseText = responseText.replace(jsonMatch[0], '').trim();
            
            if (!responseText) {
              responseText = '✅ ' + (actionData.reply || 'I have added the password to your vault.');
            } else {
              if (actionData.reply && !responseText.includes(actionData.reply)) {
                 responseText += '\n\n✅ ' + actionData.reply;
              } else if (!actionData.reply) {
                 responseText += '\n\n✅ I have added the password to your vault.';
              }
            }

            // Generate secure password
            const newPassword = generatePassword({ length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true });
            
            // Encrypt and save
            const payload = {
              username: '',
              password: newPassword,
              notes: 'Auto-generated by VaultAI Assistant'
            };
            const encrypted = await encryptData(payload, cryptoKey);
            
            const saveRes = await fetch('/api/credentials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: actionData.name,
                url: '',
                category: 'General',
                encryptedData: encrypted.encryptedData,
                iv: encrypted.iv,
              }),
            });
            
            if (saveRes.ok) {
               toast.success('Password Added', `Saved credential for ${actionData.name}`);
            } else {
               toast.error('Failed to save', 'Could not add credential to vault');
            }
          }
        } catch (e) {
          console.error('Failed to parse AI action:', e);
        }
      }

      setChatMessages((prev) => [...prev, { role: 'assistant', content: responseText }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (status === 'loading') return <div className="page-container"><p>Loading...</p></div>;
  if (!session) return null;

  // Master password lock
  if (!cryptoKey) {
    return (
      <div className="master-lock-overlay">
        <form className="master-lock-card" onSubmit={handleUnlock}>
          <div className="master-lock-icon">🤖</div>
          <h2>Unlock AI Features</h2>
          <p>Enter your master password to run AI security analysis</p>
          <input
            type="password"
            className="input"
            placeholder="Master Password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          <button type="submit" className="btn btn-primary btn-lg" disabled={unlocking} style={{ width: '100%' }}>
            {unlocking ? <><span className="spinner"></span> Unlocking...</> : '🔓 Unlock & Analyze'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🤖 AI Security Hub</h1>
        <p>AI-powered analysis and security assistant for your vault</p>
      </div>

      <div className="ai-hub">
        {/* Security Audit Section */}
        <div className="glass-card ai-report" style={{ padding: '28px' }}>
          <div className="flex-between" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>🔍 Vault Security Audit</h3>
            <button className="btn btn-primary btn-sm" onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? <><span className="spinner"></span> Analyzing...</> : '🚀 Run Analysis'}
            </button>
          </div>

          {!analysis && !analyzing && (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-icon">🔍</div>
              <h3>No analysis yet</h3>
              <p>Click &quot;Run Analysis&quot; to get an AI-powered security report of your vault</p>
            </div>
          )}

          {analyzing && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'float 2s ease-in-out infinite' }}>🤖</div>
              <p style={{ color: 'var(--text-secondary)' }}>AI is analyzing your vault security...</p>
            </div>
          )}

          {analysis && (
            <div className="animate-fade-in-up">
              {/* Score Banner */}
              <div className="security-score-banner glass-card" style={{ marginBottom: '24px' }}>
                <div className="score-circle">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="var(--border-color)" strokeWidth="4" />
                    <circle
                      cx="40" cy="40" r="35" fill="none"
                      stroke={analysis.overallScore >= 70 ? 'var(--success)' : analysis.overallScore >= 40 ? 'var(--warning)' : 'var(--danger)'}
                      strokeWidth="4"
                      strokeDasharray={`${(analysis.overallScore / 100) * 220} 220`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="score-value">{analysis.overallScore}</span>
                  <span className="score-grade">Grade {analysis.grade}</span>
                </div>
                <div className="score-info">
                  <h3>Security Score</h3>
                  <p>{analysis.summary}</p>
                </div>
              </div>

              {/* Risks */}
              {analysis.risks?.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>⚠️ Identified Risks</h4>
                  {analysis.risks.map((risk, i) => (
                    <div key={i} className="risk-item">
                      <span className={`risk-badge ${risk.level}`}>{risk.level}</span>
                      <div className="risk-content">
                        <h4>{risk.title}</h4>
                        <p>{risk.description}</p>
                        {risk.action && <p style={{ marginTop: '4px', color: 'var(--accent-secondary)', fontSize: '12px' }}>💡 {risk.action}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Strengths */}
              {analysis.strengths?.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>✅ Strengths</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {analysis.strengths.map((s, i) => (
                      <span key={i} style={{ padding: '6px 12px', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-full)', fontSize: '13px' }}>
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations?.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>💡 Recommendations</h4>
                  <ul className="recommendation-list">
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i}>
                        <span className="rec-icon">→</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.isFallback && (
                <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                  ℹ️ Using built-in analysis. Add a Gemini API key for AI-powered insights.
                </p>
              )}
            </div>
          )}
        </div>

        {/* AI Chat Section */}
        <div className="glass-card" style={{ padding: '0', gridColumn: '1 / -1' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>💬 AI Security Assistant</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ask about password security, phishing, 2FA, and more</p>
          </div>

          <div className="ai-chat-container">
            <div className="chat-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-message ${msg.role}`}>
                  <div className="chat-avatar">
                    {msg.role === 'assistant' ? '🤖' : '👤'}
                  </div>
                  <div className="chat-bubble">{msg.content}</div>
                </div>
              ))}
              {chatLoading && (
                <div className="chat-message assistant">
                  <div className="chat-avatar">🤖</div>
                  <div className="chat-bubble">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form className="chat-input-bar" onSubmit={handleChat}>
              <input
                className="input"
                placeholder="Ask about security..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button type="submit" className="btn btn-primary" disabled={chatLoading || !chatInput.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
