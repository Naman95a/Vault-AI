'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { deriveKey, encryptData, decryptData, generatePassword, analyzePasswordStrength, checkPwnedPassword } from '@/lib/crypto';
import { useToast } from '@/components/ToastProvider';

const CATEGORIES = ['All', 'General', 'Social', 'Banking', 'Work', 'Shopping', 'Entertainment', 'Email'];
const CATEGORY_COLORS = {
  General: '#6b7280', Social: '#8b5cf6', Banking: '#10b981',
  Work: '#3b82f6', Shopping: '#f59e0b', Entertainment: '#ec4899', Email: '#ef4444',
};

export default function VaultPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();

  // State
  const [cryptoKey, setCryptoKey] = useState(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [decryptedCache, setDecryptedCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedField, setCopiedField] = useState(null);

  // Auth redirect
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  // Fetch credentials
  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/credentials');
      const data = await res.json();
      if (res.ok) setCredentials(data.credentials || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchCredentials();
  }, [session, fetchCredentials]);

  // Decrypt credentials when key is available
  useEffect(() => {
    if (!cryptoKey || credentials.length === 0) return;
    const decryptAll = async () => {
      const cache = {};
      for (const cred of credentials) {
        try {
          cache[cred.id] = await decryptData(cred.encryptedData, cred.iv, cryptoKey);
        } catch {
          cache[cred.id] = { username: '(decryption failed)', password: '***', notes: '' };
        }
      }
      setDecryptedCache(cache);
    };
    decryptAll();
  }, [cryptoKey, credentials]);

  // Unlock vault
  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!masterPassword) return;
    setUnlocking(true);
    try {
      const key = await deriveKey(masterPassword, session.user.masterSalt);
      setCryptoKey(key);
      toast.success('Vault Unlocked', 'Your encrypted vault is now accessible');
    } catch (err) {
      toast.error('Unlock Failed', 'Invalid master password');
    } finally {
      setUnlocking(false);
      setMasterPassword('');
    }
  };

  // Copy to clipboard
  const handleCopy = async (text, fieldId) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success('Copied', 'Copied to clipboard');
  };

  // Export Vault
  const handleExport = () => {
    if (!credentials.length) return toast.error('Empty Vault', 'No credentials to export');
    const dataStr = JSON.stringify(credentials, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export Successful', 'Your encrypted vault backup has been downloaded');
  };

  // Import Vault
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData)) throw new Error('Invalid format');
        
        let successCount = 0;
        for (const cred of importedData) {
          if (!cred.encryptedData || !cred.iv || !cred.name) continue;
          const res = await fetch('/api/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: cred.name,
              url: cred.url,
              category: cred.category,
              encryptedData: cred.encryptedData,
              iv: cred.iv,
            }),
          });
          if (res.ok) successCount++;
        }
        
        if (successCount > 0) {
          toast.success('Import Complete', `Successfully imported ${successCount} credentials`);
          fetchCredentials();
        } else {
          toast.error('Import Failed', 'No valid credentials found in backup file');
        }
      } catch (err) {
        toast.error('Import Error', 'Invalid backup file format');
      }
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  // Toggle favorite
  const handleToggleFavorite = async (cred) => {
    try {
      await fetch(`/api/credentials/${cred.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !cred.isFavorite }),
      });
      fetchCredentials();
    } catch (err) {
      toast.error('Error', 'Failed to update');
    }
  };

  // Delete credential
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this credential?')) return;
    try {
      await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
      toast.success('Deleted', 'Credential removed from vault');
      fetchCredentials();
    } catch (err) {
      toast.error('Error', 'Failed to delete');
    }
  };

  // Filter credentials
  const filtered = credentials.filter((c) => {
    const matchCategory = activeCategory === 'All' || c.category === activeCategory;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.url?.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Stats
  const totalPasswords = credentials.length;
  const favoriteCount = credentials.filter((c) => c.isFavorite).length;
  const categoryCount = new Set(credentials.map((c) => c.category)).size;
  const avgStrength = Object.values(decryptedCache).length > 0
    ? Math.round(Object.values(decryptedCache).reduce((sum, d) => sum + (analyzePasswordStrength(d.password)?.score || 0), 0) / Object.values(decryptedCache).length)
    : 0;

  if (status === 'loading') return <div className="page-container"><LoadingSkeleton /></div>;
  if (!session) return null;

  // Master password lock screen
  if (!cryptoKey) {
    return (
      <div className="master-lock-overlay">
        <form className="master-lock-card" onSubmit={handleUnlock}>
          <div className="master-lock-icon">🔐</div>
          <h2>Unlock Your Vault</h2>
          <p>Enter your master password to decrypt your credentials</p>
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
            {unlocking ? <><span className="spinner"></span> Unlocking...</> : '🔓 Unlock Vault'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1>🗄️ Your Vault</h1>
        <p>Manage your encrypted credentials securely</p>
      </div>

      {/* Stats */}
      <div className="vault-stats stagger-children">
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>🔑</div>
          <div className="stat-info">
            <div className="stat-value">{totalPasswords}</div>
            <div className="stat-label">Total Passwords</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>⭐</div>
          <div className="stat-info">
            <div className="stat-value">{favoriteCount}</div>
            <div className="stat-label">Favorites</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(34,211,238,0.15)' }}>📂</div>
          <div className="stat-info">
            <div className="stat-value">{categoryCount}</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: avgStrength >= 70 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
            {avgStrength >= 70 ? '💪' : '⚠️'}
          </div>
          <div className="stat-info">
            <div className="stat-value">{avgStrength}<span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>/100</span></div>
            <div className="stat-label">Avg Strength</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="vault-toolbar">
        <div className="search-box input-with-icon">
          <span className="input-icon">🔍</span>
          <input
            type="text"
            className="input"
            placeholder="Search credentials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleExport} title="Export Encrypted Backup">
            ⬇️ Export
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }} title="Import Encrypted Backup">
            ⬆️ Import
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <button className="btn btn-primary" onClick={() => { setEditingCredential(null); setShowAddModal(true); }}>
            ➕ Add New
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="category-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Credentials Grid */}
      {filtered.length > 0 ? (
        <div className="credentials-grid stagger-children">
          {filtered.map((cred) => {
            const decrypted = decryptedCache[cred.id];
            const catColor = CATEGORY_COLORS[cred.category] || CATEGORY_COLORS.General;

            return (
              <div key={cred.id} className="glass-card credential-card">
                <div className="credential-header">
                  <div className="credential-logo" style={{ background: catColor }}>
                    {cred.name.charAt(0)}
                  </div>
                  <div className="credential-info">
                    <div className="credential-name">{cred.name}</div>
                    {cred.url && <div className="credential-url">{cred.url}</div>}
                  </div>
                  <button
                    className={`credential-fav ${cred.isFavorite ? 'active' : ''}`}
                    onClick={() => handleToggleFavorite(cred)}
                    title={cred.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {cred.isFavorite ? '⭐' : '☆'}
                  </button>
                </div>

                {decrypted && (
                  <div className="credential-body">
                    <div className="credential-field">
                      <span className="credential-field-label">User</span>
                      <span className="credential-field-value">{decrypted.username || '—'}</span>
                      <div className="credential-field-actions">
                        <button onClick={() => handleCopy(decrypted.username, `user-${cred.id}`)} title="Copy username">
                          {copiedField === `user-${cred.id}` ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                    <div className="credential-field">
                      <span className="credential-field-label">Pass</span>
                      <span className="credential-field-value">
                        {visiblePasswords[cred.id] ? decrypted.password : '••••••••••'}
                      </span>
                      <div className="credential-field-actions">
                        <button
                          onClick={() => setVisiblePasswords((prev) => ({ ...prev, [cred.id]: !prev[cred.id] }))}
                          title={visiblePasswords[cred.id] ? 'Hide' : 'Show'}
                        >
                          {visiblePasswords[cred.id] ? '🙈' : '👁️'}
                        </button>
                        <button onClick={() => handleCopy(decrypted.password, `pass-${cred.id}`)} title="Copy password">
                          {copiedField === `pass-${cred.id}` ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="credential-footer">
                  <span
                    className="credential-category"
                    style={{ background: catColor + '20', color: catColor }}
                  >
                    {cred.category}
                  </span>
                  <div className="credential-actions">
                    <button onClick={() => { setEditingCredential({ ...cred, decrypted }); setShowAddModal(true); }} title="Edit">✏️</button>
                    <button className="delete-btn" onClick={() => handleDelete(cred.id)} title="Delete">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔐</div>
          <h3>{search ? 'No matching credentials' : 'Your vault is empty'}</h3>
          <p>{search ? 'Try a different search term' : 'Add your first credential to get started'}</p>
          {!search && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              ➕ Add Your First Password
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddCredentialModal
          cryptoKey={cryptoKey}
          credential={editingCredential}
          onClose={() => { setShowAddModal(false); setEditingCredential(null); }}
          onSaved={() => { setShowAddModal(false); setEditingCredential(null); fetchCredentials(); }}
          toast={toast}
        />
      )}
    </div>
  );
}

/* ---- Add/Edit Credential Modal ---- */
function AddCredentialModal({ cryptoKey, credential, onClose, onSaved, toast }) {
  const isEdit = !!credential;
  const [form, setForm] = useState({
    name: credential?.name || '',
    url: credential?.url || '',
    category: credential?.category || 'General',
    username: credential?.decrypted?.username || '',
    password: credential?.decrypted?.password || '',
    notes: credential?.decrypted?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [genOptions, setGenOptions] = useState({ length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true });
  const [generatedPw, setGeneratedPw] = useState('');

  const [checkingBreach, setCheckingBreach] = useState(false);
  const [breachResult, setBreachResult] = useState(null);

  const handleCheckBreach = async () => {
    if (!form.password) return;
    setCheckingBreach(true);
    setBreachResult(null);
    try {
      const res = await checkPwnedPassword(form.password);
      setBreachResult(res);
      if (res.pwned) {
        toast.error('Password Leaked', `This password has been exposed ${res.count.toLocaleString()} times in data breaches!`);
      } else {
        toast.success('Password Safe', 'This password was not found in any known data breaches.');
      }
    } catch (e) {
      toast.error('Error', 'Failed to check breach database');
    } finally {
      setCheckingBreach(false);
    }
  };

  const strength = analyzePasswordStrength(form.password);

  const handleGenerate = () => {
    const pw = generatePassword(genOptions);
    setGeneratedPw(pw);
  };

  const handleUseGenerated = () => {
    setForm((prev) => ({ ...prev, password: generatedPw }));
    setShowGenerator(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.password) {
      toast.error('Missing Fields', 'Name and password are required');
      return;
    }

    setSaving(true);
    try {
      const { encryptedData, iv } = await encryptData(
        { username: form.username, password: form.password, notes: form.notes },
        cryptoKey
      );

      const body = { encryptedData, iv, name: form.name, url: form.url, category: form.category };

      const url = isEdit ? `/api/credentials/${credential.id}` : '/api/credentials';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(isEdit ? 'Updated' : 'Added', `Credential ${isEdit ? 'updated' : 'saved'} securely`);
        onSaved();
      } else {
        toast.error('Error', 'Failed to save credential');
      }
    } catch (err) {
      toast.error('Encryption Error', 'Failed to encrypt data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? '✏️ Edit Credential' : '➕ Add Credential'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Name *</label>
            <input
              className="input"
              placeholder="e.g. Gmail, Netflix"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>

          <div className="input-group">
            <label>Website URL</label>
            <input
              className="input"
              placeholder="https://example.com"
              value={form.url}
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
            />
          </div>

          <div className="input-group">
            <label>Category</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            >
              {['General', 'Social', 'Banking', 'Work', 'Shopping', 'Entertainment', 'Email'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Username / Email</label>
            <input
              className="input"
              placeholder="user@example.com"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            />
          </div>

          <div className="input-group">
            <label>Password *</label>
            <input
              className="input"
              type="text"
              placeholder="Enter or generate a password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              style={{ fontFamily: "'SF Mono', 'Fira Code', monospace" }}
            />
            {form.password && (
              <div className="strength-meter">
                <div className="strength-bar-track">
                  <div className="strength-bar-fill" style={{ width: `${strength.score}%`, background: strength.color }} />
                </div>
                <div className="strength-label">
                  <span className="label-text" style={{ color: strength.color }}>{strength.label}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{strength.score}/100</span>
                </div>
              </div>
            )}
            <div className="password-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowGenerator(!showGenerator); if (!generatedPw) handleGenerate(); }}>
                ⚡ {showGenerator ? 'Hide' : 'Password'} Generator
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCheckBreach} disabled={!form.password || checkingBreach}>
                {checkingBreach ? 'Checking...' : '🛡️ Check Breach'}
              </button>
            </div>
            {breachResult && (
              <div style={{ marginTop: '8px', padding: '8px', borderRadius: '8px', fontSize: '13px', background: breachResult.pwned ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: breachResult.pwned ? '#ef4444' : '#10b981' }}>
                {breachResult.pwned ? `⚠️ EXPOSED: Seen ${breachResult.count.toLocaleString()} times in data breaches. DO NOT USE IT!` : '✅ SECURE: Not found in any known breaches (k-Anonymity verified).'}
              </div>
            )}
          </div>

          {showGenerator && (
            <div className="password-generator">
              <h4>⚡ Password Generator</h4>
              <div className="generated-password">
                <code>{generatedPw || 'Click generate'}</code>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleGenerate}>🔄</button>
              </div>
              <div className="length-slider">
                <div className="slider-header">
                  <span>Length</span>
                  <span>{genOptions.length}</span>
                </div>
                <input
                  type="range"
                  min="8" max="64"
                  value={genOptions.length}
                  onChange={(e) => setGenOptions((p) => ({ ...p, length: parseInt(e.target.value) }))}
                />
              </div>
              <div className="generator-options">
                {[
                  ['uppercase', 'A-Z'],
                  ['lowercase', 'a-z'],
                  ['numbers', '0-9'],
                  ['symbols', '!@#$'],
                ].map(([key, label]) => (
                  <label key={key} className="generator-option">
                    <input
                      type="checkbox"
                      checked={genOptions[key]}
                      onChange={(e) => setGenOptions((p) => ({ ...p, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: '12px', width: '100%' }} onClick={handleUseGenerated}>
                Use This Password
              </button>
            </div>
          )}

          <div className="input-group">
            <label>Notes</label>
            <textarea
              className="input"
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner"></span> Encrypting...</> : isEdit ? '💾 Update' : '🔐 Save Encrypted'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---- Loading Skeleton ---- */
function LoadingSkeleton() {
  return (
    <div>
      <div className="vault-stats">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton skeleton-card" style={{ height: '80px' }} />
        ))}
      </div>
      <div className="credentials-grid" style={{ marginTop: '24px' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}
