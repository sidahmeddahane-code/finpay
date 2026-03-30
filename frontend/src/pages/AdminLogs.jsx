import { useState, useEffect } from 'react';
import { ClipboardList, Search } from 'lucide-react';

const ACTION_LABELS = {
  APPROVE_INVOICE:       { label: 'Facture approuvée',       color: '#22c55e' },
  REJECT_INVOICE:        { label: 'Facture refusée',         color: '#ef4444' },
  PAY_INVOICE_TO_PROVIDER: { label: 'Facture payée fournisseur', color: '#3b82f6' },
  APPROVE_KYC:           { label: 'KYC approuvé',            color: '#22c55e' },
  REJECT_KYC:            { label: 'KYC rejeté',              color: '#ef4444' },
  REQUEST_KYC_DOCS:      { label: 'Docs KYC demandés',       color: '#f59e0b' },
  APPROVE_FEE:           { label: 'Frais validés',           color: '#22c55e' },
  REJECT_FEE:            { label: 'Frais refusés',           color: '#ef4444' },
  APPROVE_PAYMENT:       { label: 'Paiement validé',         color: '#22c55e' },
  REJECT_PAYMENT:        { label: 'Paiement refusé',         color: '#ef4444' },
  BLOCK_USER:            { label: 'Utilisateur bloqué',      color: '#ef4444' },
  UNBLOCK_USER:          { label: 'Utilisateur débloqué',    color: '#22c55e' },
  DELETE_USER:           { label: 'Utilisateur supprimé',    color: '#7f1d1d' },
};

const TARGET_ICONS = {
  INVOICE: '🧾',
  KYC:     '🪪',
  PAYMENT: '💳',
  PLAN:    '📋',
  USER:    '👤',
};

const AdminLogs = () => {
  const [logs, setLogs]         = useState([]);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('ALL');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const res   = await fetch('/api/admin/logs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data  = await res.json();
        if (Array.isArray(data)) setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const categories = ['ALL', 'INVOICE', 'KYC', 'PAYMENT', 'PLAN', 'USER'];

  const filtered = logs.filter(log => {
    const matchCat    = filter === 'ALL' || log.targetType === filter;
    const term        = search.toLowerCase();
    const matchSearch = !search ||
      log.adminName.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.details || '').toLowerCase().includes(term);
    return matchCat && matchSearch;
  });

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>Chargement...</div>;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <ClipboardList color="var(--primary)" /> Historique des Actions Admin
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Toutes les actions effectuées par les administrateurs — visible uniquement par le Super Admin.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Category filter tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                className={`btn ${filter === cat ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                {cat === 'ALL' ? 'Tout' : `${TARGET_ICONS[cat] || ''} ${cat}`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Rechercher admin, action..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', width: '220px' }}
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['APPROVE', 'REJECT', 'BLOCK', 'DELETE'].map(type => {
          const count = logs.filter(l => l.action.startsWith(type)).length;
          const colors = { APPROVE: '#22c55e', REJECT: '#ef4444', BLOCK: '#f59e0b', DELETE: '#7f1d1d' };
          return (
            <div key={type} className="surface" style={{ padding: '12px 20px', borderLeft: `4px solid ${colors[type]}`, minWidth: '120px' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: colors[type] }}>{count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {type === 'APPROVE' ? 'Approbations' : type === 'REJECT' ? 'Refus' : type === 'BLOCK' ? 'Blocages' : 'Suppressions'}
              </div>
            </div>
          );
        })}
        <div className="surface" style={{ padding: '12px 20px', borderLeft: '4px solid var(--primary)', minWidth: '120px' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{logs.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total actions</div>
        </div>
      </div>

      {/* Table */}
      <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Aucune action trouvée.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-color)' }}>
                {['Date & Heure', 'Administrateur', 'Action', 'Cible', 'Détails'].map(h => (
                  <th key={h} style={{ padding: '14px 18px', textAlign: 'left', fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => {
                const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text-muted)' };
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)' }}>
                    <td style={{ padding: '13px 18px', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleDateString('fr-FR')}<br />
                      <span style={{ fontSize: '0.75rem' }}>{new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td style={{ padding: '13px 18px', fontWeight: 500 }}>
                      {log.adminName}
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      <span style={{
                        display: 'inline-block',
                        background: `${meta.color}20`,
                        color: meta.color,
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '0.85rem' }}>
                      <span style={{ marginRight: '6px' }}>{TARGET_ICONS[log.targetType] || '📌'}</span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {log.targetId.slice(0, 8)}...
                      </span>
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                      {log.details || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ textAlign: 'right', marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {filtered.length} / {logs.length} actions affichées
      </p>
    </div>
  );
};

export default AdminLogs;
