import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================
// KONFIGURASI
// ============================================================
const CAR_NAME = 'BYD Atto 1';
const CAR_VARIANT = 'Dynamic · 2026';
const CAR_PRICE = 199000000;
const CAR_IMAGE = 'https://byd.arista-group.co.id/wp-content/uploads/2025/07/Atto-1-Cosmos-Black.png';
const TABLE_NAME = 'byd_savings';

// Masukkan Gemini API Key di .env kamu dengan nama VITE_GEMINI_API_KEY
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API || import.meta.env.VITE_GROQ_API_KEY || "";

// ============================================================
// HELPERS
// ============================================================
const fmtShort = (n) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}Jt`;
  return n.toLocaleString('id-ID');
};

const fmtFull = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n);

const getEstimation = (saved, avg) => {
  if (avg <= 0 || saved >= CAR_PRICE) return null;
  const months = Math.ceil((CAR_PRICE - saved) / avg);
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return { months, label: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) };
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CarTracker() {
  const [savings, setSavings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAI, setShowAI] = useState(false); // <--- State Pintu Rahasia AI
  const [editingId, setEditingId] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { fetchSavings(); }, []);

  const fetchSavings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from(TABLE_NAME).select('*').order('created_at', { ascending: false });
    setSavings(data || []);
    setLoading(false);
  };

  const totalSaved = savings.reduce((a, s) => a + s.amount, 0);
  const remaining = Math.max(CAR_PRICE - totalSaved, 0);
  const pct = Math.min((totalSaved / CAR_PRICE) * 100, 100);

  const monthlyAvg = (() => {
    if (!savings.length) return 0;
    const g = {};
    savings.forEach(s => { const k = s.created_at.slice(0, 7); g[k] = (g[k] || 0) + s.amount; });
    const vals = Object.values(g);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();

  const est = getEstimation(totalSaved, monthlyAvg);
  const R = 72;
  const circ = 2 * Math.PI * R;

  const handleShowForm = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setAmount(item.amount.toLocaleString('id-ID'));
      setNote(item.note || '');
    } else {
      setEditingId(null);
      setAmount('');
      setNote('');
    }
    setError('');
    setShowForm(true);
  };

  const submitSaving = async (e) => {
    e.preventDefault();
    const val = parseInt(amount.replace(/\D/g, ''));
    if (!val || val <= 0) { setError('Masukkan jumlah yang valid!'); return; }
    setError(''); setIsSaving(true);
    if (editingId) {
      const { error: err } = await supabase.from(TABLE_NAME).update({ amount: val, note: note.trim() || null }).eq('id', editingId);
      if (!err) { setShowForm(false); fetchSavings(); } else setError('Gagal memperbarui!');
    } else {
      const { error: err } = await supabase.from(TABLE_NAME).insert([{ amount: val, note: note.trim() || null }]);
      if (!err) { setShowForm(false); fetchSavings(); } else setError('Gagal menyimpan!');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id) => {
    await supabase.from(TABLE_NAME).delete().eq('id', id);
    setDeleteId(null); fetchSavings();
  };

  const handleAmountInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAmount(raw ? parseInt(raw).toLocaleString('id-ID') : '');
  };

  return (
    <div className="root">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ===== NAVBAR ===== */}
      <nav className="navbar">
        <div className="nav-inner">
          <div className="nav-logo-wrap" onDoubleClick={() => setShowAI(true)} title="Secret Hub">
            <span className="nav-logo">DUTA CAR SAVINGS</span>
          </div>
          <button className="nav-btn" onClick={() => handleShowForm()}>+ Entry</button>
        </div>
      </nav>

      {/* TAMPILAN AI (BISA TERTUTUP) */}
      <AnimatePresence>
        {showAI && <AIChatHub onClose={() => setShowAI(false)} />}
      </AnimatePresence>

      <div className="container" style={{ display: showAI ? 'none' : 'block' }}>
        {/* ===== HERO ===== */}
        <section className="hero">
          <div className="hero-text">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hero-tag">TARGET 2026</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hero-title">{CAR_NAME}</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hero-variant">{CAR_VARIANT}</motion.p>
            <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="hero-price">{fmtFull(CAR_PRICE)}</motion.p>
            <motion.button className="hero-cta" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleShowForm()}>+ Tambah Tabungan</motion.button>
          </div>
          <div className="hero-img-wrap">
            <motion.img initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1 }} src={CAR_IMAGE} alt="BYD Atto 1" className="hero-img" onError={e => e.target.style.display = 'none'} />
            <div className="img-glow"></div>
          </div>
        </section>

        {/* ===== DASHBOARD ===== */}
        <section className="dashboard">
          <motion.div className="card progress-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="progress-visual">
              <div className="ring-wrap">
                <svg width="180" height="180" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                  <motion.circle cx="90" cy="90" r={R} fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ * (1 - pct / 100) }} transition={{ duration: 1.5, ease: 'easeOut' }} style={{ transform: 'rotate(-90deg)', transformOrigin: '90px 90px' }} />
                </svg>
                <div className="ring-content">
                  <span className="pct-val">{pct.toFixed(1)}%</span>
                  <span className="pct-label">DARI TARGET</span>
                </div>
              </div>
              <div className="bar-container">
                <div className="bar-rail"><motion.div className="bar-progress" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.5 }} /></div>
                <div className="bar-meta"><span>Rp 0</span><span>{fmtShort(CAR_PRICE)}</span></div>
              </div>
            </div>
            <div className="v-line"></div>
            <div className="stats-grid">
              <StatItem label="TERKUMPUL" value={`Rp ${fmtShort(totalSaved)}`} sub={fmtFull(totalSaved)} />
              <StatItem label="KURANG LAGI" value={`Rp ${fmtShort(remaining)}`} sub={fmtFull(remaining)} />
              <StatItem label="RATA-RATA / BULAN" value={monthlyAvg > 0 ? `Rp ${fmtShort(monthlyAvg)}` : '—'} sub={monthlyAvg > 0 ? fmtFull(Math.round(monthlyAvg)) : 'No data yet'} />
              <StatItem label="ESTIMASI TERCAPAI" value={est ? `${est.months} bulan lagi` : totalSaved >= CAR_PRICE ? 'TERCAPAI' : '—'} sub={est ? est.label : totalSaved >= CAR_PRICE ? 'Selamat!' : 'Mulai menabung sekarang'} />
            </div>
          </motion.div>
        </section>

        {/* ===== HISTORY ===== */}
        <section className="history-section">
          <div className="history-header">
            <h2 className="title-medium">Riwayat Nabung</h2>
            <div className="tag-count">{savings.length} Catatan</div>
          </div>
          {loading ? (
            <div className="loader-wrap"><div className="spinner"></div><p>Mengambil data...</p></div>
          ) : savings.length === 0 ? (
            <div className="empty-box"><p>Belum ada catatan.</p></div>
          ) : (
            <div className="history-list">
              <AnimatePresence>
                {savings.map((sv, i) => (
                  <motion.div key={sv.id} className="history-item" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className="history-left">
                      <div className="dot"></div>
                      <div className="info">
                        <p className="amt">{fmtFull(sv.amount)}</p>
                        <p className="note">{sv.note || 'Berhasil ditabung'}</p>
                      </div>
                    </div>
                    <div className="history-right">
                      <p className="date">{new Date(sv.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <div className="history-actions">
                        <button className="btn-edit" onClick={() => handleShowForm(sv)}>Edit</button>
                        <button className="btn-del" onClick={() => setDeleteId(sv.id)}>Hapus</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>

      {/* ===== MODAL FORM & DELETE (TETAP SAMA) ===== */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)}>
            <motion.div className="modal" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()}>
              <div className="handle"></div>
              <h3 className="modal-title">{editingId ? 'Ubah Tabungan' : 'Tambah Tabungan'}</h3>
              <form onSubmit={submitSaving} className="form">
                <div className="group">
                  <label className="label">JUMLAH (RP)</label>
                  <input className="input" type="text" placeholder="Contoh: 10.000.000" value={amount} onChange={handleAmountInput} autoFocus inputMode="numeric" />
                </div>
                <div className="group">
                  <label className="label">CATATAN <span style={{ opacity: 0.5 }}>(PILIHAN)</span></label>
                  <input className="input" type="text" placeholder="Contoh: Bonus Tahunan" value={note} onChange={e => setNote(e.target.value)} />
                </div>
                {error && <div className="error-text">! {error}</div>}
                <div className="actions">
                  <button type="button" className="action-cancel" onClick={() => setShowForm(false)}>Batal</button>
                  <button type="submit" className="action-submit" disabled={isSaving}>{isSaving ? 'Menyimpan...' : editingId ? 'Simpan' : 'Simpan'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)}>
            <motion.div className="modal mini-modal" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={e => e.stopPropagation()}>
              <div className="handle"></div><h3 className="modal-title">Hapus?</h3><p className="modal-desc">Data hilang permanen.</p>
              <div className="actions"><button className="action-cancel" onClick={() => setDeleteId(null)}>Batal</button><button className="action-danger" onClick={() => handleDelete(deleteId)}>Hapus</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        body { background: #000; overflow-x: hidden; }
        .root { min-height: 100vh; background: #000; color: #fff; font-family: 'Outfit', sans-serif; padding-bottom: 100px; position: relative; }
        .container { max-width: 1000px; margin: 0 auto; padding: 0 20px; }
        .navbar { position: sticky; top: 0; z-index: 100; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .nav-inner { max-width: 1000px; margin: 0 auto; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; }
        .nav-logo { font-size: 14px; font-weight: 800; letter-spacing: 2px; color: #fff; cursor: pointer; user-select: none; }
        .nav-btn { background: #fff; color: #000; border: none; border-radius: 9px; padding: 7px 16px; font-size: 13px; font-weight: 700; cursor: pointer; display: none; }
        @media (max-width: 768px) { .nav-btn { display: block; } }
        .hero { display: flex; align-items: center; justify-content: space-between; padding: 60px 0 40px; gap: 40px; flex-wrap: wrap; }
        .hero-text { flex: 1; min-width: 320px; }
        .hero-tag { font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 3px; margin-bottom: 12px; }
        .hero-title { font-size: clamp(40px, 6vw, 64px); font-weight: 900; line-height: 1; margin-bottom: 10px; }
        .hero-variant { font-size: 14px; color: #94a3b8; margin-bottom: 24px; font-weight: 500; }
        .hero-price { font-size: clamp(28px, 4vw, 42px); font-weight: 800; margin-bottom: 32px; color: #fff; }
        .hero-cta { background: #fff; color: #000; border: none; border-radius: 14px; padding: 16px 36px; font-size: 16px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 30px rgba(255,255,255,0.1); }
        .hero-img-wrap { flex: 1.2; min-width: 340px; position: relative; display: flex; justify-content: center; }
        .hero-img { width: 100%; max-width: 580px; height: auto; position: relative; z-index: 2; filter: drop-shadow(0 20px 40px rgba(0,0,0,0.8)); }
        .img-glow { position: absolute; bottom: 0; width: 80%; height: 20%; background: radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 70%); filter: blur(20px); }
        .card { background: #0f0f0f; border: 1px solid rgba(255,255,255,0.08); border-radius: 28px; padding: 40px; display: flex; gap: 40px; align-items: center; flex-wrap: wrap; }
        .progress-visual { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 24px; }
        .ring-wrap { position: relative; width: 180px; height: 180px; }
        .ring-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .pct-val { font-size: 38px; font-weight: 900; line-height: 1; color: #fff; }
        .pct-label { font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 1.5px; margin-top: 6px; }
        .bar-container { width: 200px; }
        .bar-rail { height: 6px; background: rgba(255,255,255,0.04); border-radius: 10px; overflow: hidden; margin-bottom: 8px; }
        .bar-progress { height: 100%; background: #fff; border-radius: 10px; box-shadow: 0 0 15px rgba(255,255,255,0.2); }
        .bar-meta { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #475569; }
        .v-line { width: 1px; align-self: stretch; background: rgba(255,255,255,0.06); }
        .stats-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 32px; }
        .stat-label { font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 6px; }
        .stat-value { font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 4px; line-height: 1.1; }
        .stat-sub { font-size: 13px; font-weight: 500; color: #475569; }
        .history-section { margin-top: 50px; }
        .history-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .title-medium { font-size: 20px; font-weight: 800; }
        .tag-count { background: #1e293b; color: #94a3b8; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .history-list { display: flex; flex-direction: column; gap: 12px; }
        .history-item { background: #0f0f0f; border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; transition: border-color 0.2s; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px #fff; }
        .amt { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 2px; }
        .note { font-size: 13px; color: #64748b; font-weight: 500; }
        .history-right { display: flex; align-items: center; gap: 16px; }
        .date { font-size: 13px; color: #475569; font-weight: 600; text-align: right; }
        .history-actions { display: flex; gap: 8px; }
        .btn-edit { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); color: #94a3b8; padding: 6px 14px; border-radius: 10px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .btn-del { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); color: #475569; padding: 6px 14px; border-radius: 10px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .loader-wrap { text-align: center; padding: 60px 0; color: #64748b; }
        .spinner { width: 32px; height: 32px; border: 2px solid rgba(255,255,255,0.1); border-top-color: #fff; border-radius: 50%; animation: rot 1s infinite linear; margin: 0 auto 16px; }
        @keyframes rot { to { transform: rotate(360deg); } }
        .overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.8); backdrop-filter: blur(15px); display: flex; align-items: flex-end; justify-content: center; }
        .modal { background: #0f0f0f; border-top: 1px solid rgba(255,255,255,0.1); border-radius: 32px 32px 0 0; padding: 24px 24px 44px; width: 100%; box-shadow: 0 -20px 60px rgba(0,0,0,0.6); }
        .form { display: flex; flex-direction: column; gap: 20px; }
        .input { background: #18181b; border: 1px solid #27272a; border-radius: 14px; padding: 16px; color: #fff; font-size: 16px; font-weight: 600; width: 100%; }
        .action-cancel { flex: 1; background: #18181b; border: 1px solid #27272a; color: #f8fafc; border-radius: 14px; padding: 16px; font-weight: 700; cursor: pointer; }
        .action-submit { flex: 1.2; background: #fff; color: #000; border: none; border-radius: 14px; padding: 16px; font-weight: 800; cursor: pointer; }
        .action-danger { flex: 1.2; background: #ef4444; color: #fff; border: none; border-radius: 14px; padding: 16px; font-weight: 800; cursor: pointer; }
        @media (min-width: 768px) { .modal { border-radius: 28px !important; max-width: 480px; } }

        /* AI SPECIFIC STYLES */
        .ai-hub-root {
          position: fixed; inset: 0; z-index: 200;
          background: #000; display: flex; flex-direction: column;
          font-family: 'Outfit', sans-serif;
        }
        .ai-header {
          padding: 18px 24px; border-bottom: 1px solid #111;
          display: flex; align-items: center; justify-content: space-between;
          background: #050505;
        }
        .ai-title-wrap { display: flex; align-items: center; gap: 10px; }
        .ai-badge { background: #fff; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 900; }
        .ai-title { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: 0.5px; }
        .btn-close-ai { background: #222; border: none; color: #fff; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; }
        
        .chat-container { flex: 1; overflow-y: auto; padding: 30px 20px; display: flex; flex-direction: column; gap: 24px; }
        .msg { max-width: 85%; padding: 16px 20px; border-radius: 20px; font-size: 15px; line-height: 1.6; }
        .msg-user { align-self: flex-end; background: #111; color: #fff; border-bottom-right-radius: 4px; border: 1px solid #222; }
        .msg-ai { align-self: flex-start; background: #000; color: #fff; border-bottom-left-radius: 4px; border: 1px solid #111; }
        
        .chat-input-area { padding: 24px; background: #050505; border-top: 1px solid #111; }
        .input-wrap { max-width: 800px; margin: 0 auto; position: relative; display: flex; gap: 12px; }
        .chat-input {
          flex: 1; background: #111; border: 1px solid #222; border-radius: 16px;
          padding: 16px 20px; color: #fff; font-size: 15px; outline: none;
        }
        .chat-input:focus { border-color: #333; }
        .btn-send {
          background: #fff; color: #000; border: none; border-radius: 16px;
          padding: 0 24px; font-weight: 800; font-size: 14px; cursor: pointer;
        }
        .btn-send:disabled { background: #222; color: #444; }
        
        .ai-welcome { text-align: center; margin: auto; max-width: 400px; }
        .ai-icon { font-size: 48px; margin-bottom: 20px; display: block; }
        .ai-welcome h2 { font-size: 24px; font-weight: 900; margin-bottom: 12px; color: #fff; }
        .ai-welcome p { color: #666; font-size: 14px; }
      `}</style>
    </div>
  );
}

// ============================================================
// COMPONENT: AI CHAT HUB (PINTU RAHASIA)
// ============================================================
function AIChatHub({ onClose }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const onSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!GROQ_API_KEY) {
      alert("API KEY Groq belum diset di .env! Isi VITE_GROQ_API");
      return;
    }

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });
      const data = await res.json();
      if (data?.error) {
        const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : data.error;
        setMessages(prev => [...prev, { role: 'ai', content: `Eror Sistem: ${errorMsg}` }]);
      } else {
        const text = data?.choices?.[0]?.message?.content || 'Tidak ada jawaban.';
        setMessages(prev => [...prev, { role: 'ai', content: text }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: `Koneksi gagal: ${err.message}` }]);
    }
    setLoading(false);
  };

  return (
    <motion.div
      className="ai-hub-root"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
    >
      <div className="ai-header">
        <div className="ai-title-wrap">
          <span className="ai-badge">CORE</span>
          <span className="ai-title">DUTA AI HUB</span>
        </div>
        <button className="btn-close-ai" onClick={onClose}>Tutup ×</button>
      </div>

      <div className="chat-container" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="ai-welcome">
            <span className="ai-icon">🦾</span>
            <h2>Halo, Duta.</h2>
            <p>Sistem AI sudah aktif. Apa yang bisa saya bantu hari ini di kantor?</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`msg msg-${m.role}`}
            >
              {m.content}
            </motion.div>
          ))
        )}
        {loading && <div className="msg msg-ai">Sedang mengetik...</div>}
      </div>

      <div className="chat-input-area">
        <form className="input-wrap" onSubmit={onSend}>
          <input
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ketik pesan atau perintah..."
            autoFocus
          />
          <button className="btn-send" type="submit" disabled={loading || !input.trim()}>
            KIRIM
          </button>
        </form>
      </div>
    </motion.div>
  );
}

// ===== STAT ITEM =====
function StatItem({ label, value, sub }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-sub">{sub}</p>
    </div>
  );
}
