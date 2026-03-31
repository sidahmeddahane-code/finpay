import { useState, useEffect } from 'react';
import { Plus, Trash2, Smartphone, Building, Shield, UserPlus, User, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ─── Admin Account Management (SUPER_ADMIN only) ────────────────────────────
const AdminAccountSection = () => {
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [newPassword, setNewPassword]   = useState('');
  const [admins, setAdmins]             = useState([]);
  const [newAdmin, setNewAdmin]         = useState({ firstName: '', lastName: '', phone: '', password: '' });
  const [saving, setSaving]             = useState(false);
  const [creating, setCreating]         = useState(false);
  const [msg, setMsg]                   = useState('');
  const token = localStorage.getItem('token');

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3500); };

  const fetchProfile = async () => {
    const res  = await fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setProfile({ firstName: data.firstName || '', lastName: data.lastName || '', phone: data.phone || '' });
  };

  const fetchAdmins = async () => {
    const res  = await fetch('/api/admin/accounts', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setAdmins(data);
  };

  useEffect(() => { fetchProfile(); fetchAdmins(); }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...profile };
      if (newPassword) body.password = newPassword;
      const res = await fetch('/api/admin/me', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return flash('❌ ' + data.error);
      flash('✅ Profil mis à jour avec succès.');
      setNewPassword('');
    } finally { setSaving(false); }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
      const data = await res.json();
      if (!res.ok) return flash('❌ ' + data.error);
      flash('✅ Compte admin créé.');
      setNewAdmin({ firstName: '', lastName: '', phone: '', password: '' });
      fetchAdmins();
    } finally { setCreating(false); }
  };

  const handleDeleteAdmin = async (id, name) => {
    if (!window.confirm(`Supprimer le compte de ${name} ?`)) return;
    const res  = await fetch(`/api/admin/accounts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return flash('❌ ' + data.error);
    flash('✅ Compte supprimé.');
    fetchAdmins();
  };

  return (
    <div className="surface mt-4" style={{ borderTop: '4px solid #f59e0b', marginTop: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <Shield size={20} color="#f59e0b" />
        <h3 style={{ margin: 0, color: '#f59e0b' }}>Gestion des Comptes Administrateurs</h3>
      </div>
      <p className="mb-4 text-muted" style={{ fontSize: '0.9rem' }}>
        Seul le Super Administrateur peut créer, modifier ou supprimer des comptes admin.
      </p>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
          background: msg.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: msg.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
          {msg}
        </div>
      )}

      <div className="grid-cols-2" style={{ alignItems: 'flex-start', gap: '30px' }}>

        {/* Mon Profil */}
        <div>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <User size={16} /> Mon Profil
          </h4>
          <form onSubmit={handleSaveProfile}>
            <div className="form-group mb-3">
              <label className="form-label">Prénom</label>
              <input className="form-input" value={profile.firstName}
                onChange={e => setProfile({ ...profile, firstName: e.target.value })} required />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Nom</label>
              <input className="form-input" value={profile.lastName}
                onChange={e => setProfile({ ...profile, lastName: e.target.value })} required />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Téléphone (login)</label>
              <input className="form-input" value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })} required />
            </div>
            <div className="form-group mb-3">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={14} /> Nouveau mot de passe <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(laisser vide = inchangé)</span>
              </label>
              <input type="password" className="form-input" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Mettre à jour mon profil'}
            </button>
          </form>
        </div>

        {/* Comptes admins */}
        <div>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <UserPlus size={16} /> Créer un compte Admin
          </h4>
          <form onSubmit={handleCreateAdmin}>
            <div className="form-group mb-3">
              <label className="form-label">Prénom</label>
              <input className="form-input" value={newAdmin.firstName} required
                onChange={e => setNewAdmin({ ...newAdmin, firstName: e.target.value })} />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Nom</label>
              <input className="form-input" value={newAdmin.lastName} required
                onChange={e => setNewAdmin({ ...newAdmin, lastName: e.target.value })} />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Téléphone</label>
              <input className="form-input" value={newAdmin.phone} required
                onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })} />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Mot de passe</label>
              <input type="password" className="form-input" value={newAdmin.password} required
                onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={creating}>
              <UserPlus size={16} /> {creating ? 'Création...' : 'Créer le compte Admin'}
            </button>
          </form>

          {admins.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h5 style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>Comptes existants ({admins.length})</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {admins.map(a => (
                  <div key={a.id} className="surface flex-between" style={{ padding: '12px 16px' }}>
                    <div>
                      <strong>{a.firstName} {a.lastName}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.phone}</div>
                      <span style={{ fontSize: '0.75rem', background: a.role === 'SUPER_ADMIN' ? 'rgba(245,158,11,0.15)' : 'rgba(67,97,238,0.1)',
                        color: a.role === 'SUPER_ADMIN' ? '#f59e0b' : 'var(--primary)',
                        padding: '2px 8px', borderRadius: '999px' }}>
                        {a.role === 'SUPER_ADMIN' ? '⭐ Super Admin' : 'Admin'}
                      </span>
                    </div>
                    {a.role !== 'SUPER_ADMIN' && (
                      <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--border-color)', padding: '8px' }}
                        onClick={() => handleDeleteAdmin(a.id, `${a.firstName} ${a.lastName}`)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
// ────────────────────────────────────────────────────────────────────────────

const AdminSettings = () => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', provider: '', accountNumber: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactData, setContactData] = useState({ address: '', phone: '', email: '', whatsapp: '', aboutText: '' });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const { t } = useTranslation();

  const fetchMethods = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/payment-methods', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMethods(data);
    } catch (err) {
      console.error('Erreur chargement méthodes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContact = async () => {
      try {
          const res = await fetch('/api/auth/settings/contact');
          const data = await res.json();
          if (data && Object.keys(data).length > 0) {
              setContactData({
                  address: data.address || '',
                  phone: data.phone || '',
                  email: data.email || '',
                  whatsapp: data.whatsapp || '',
                  aboutText: data.aboutText || ''
              });
          }
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
    fetchMethods();
    fetchContact();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  const handleContactChange = (e) => {
      setContactData({ ...contactData, [e.target.name]: e.target.value });
  }

  const handleSaveContact = async (e) => {
      e.preventDefault();
      setIsSavingContact(true);
      try {
          const token = localStorage.getItem('token');
          await fetch('/api/admin/settings/contact', {
              method: 'PUT',
              headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(contactData)
          });
          alert('Paramètres de contact mis à jour avec succès.');
      } catch (error) {
          alert("Erreur lors de la mise à jour des informations de contact.");
      } finally {
          setIsSavingContact(false);
      }
  };

  const handleAdd = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const token = localStorage.getItem('token');
        await fetch('/api/admin/payment-methods', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        setFormData({ name: '', provider: '', accountNumber: '' });
        await fetchMethods();
      } catch (error) {
          alert("Erreur lors de l'ajout.");
      } finally {
          setIsSubmitting(false);
      }
  }

  const handleDelete = async (id) => {
      if(!window.confirm("Voulez-vous vraiment supprimer ce compte d'encaissement ?")) return;
      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/admin/payment-methods/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        await fetchMethods();
      } catch (error) {
          alert('Erreur: impossible de supprimer la méthode.');
      }
  }

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>{t('status.pending', 'Chargement...')}</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="mb-2" style={{ color: 'var(--primary)' }}>{t('menu.admin_settings', "Comptes d'Encaissement")}</h1>
      <p className="mb-4" style={{ color: 'var(--text-muted)', maxWidth: '800px' }}>
        {t('settings.desc', "Configurez ici les comptes bancaires ou numéros Mobile Money sur lesquels les citoyens doivent envoyer l'argent pour rembourser leurs échéances.")}
      </p>

      <div className="grid-cols-2" style={{ alignItems: 'flex-start' }}>
          
          {/* Formulaire d'ajout */}
          <div className="surface" style={{ borderTop: '4px solid var(--primary)' }}>
              <h3 className="mb-3">{t('settings.add_account', 'Ajouter un nouveau compte')}</h3>
              <form onSubmit={handleAdd}>
                <div className="form-group mb-3">
                    <label className="form-label">{t('settings.type', 'Type de mode')}</label>
                    <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} placeholder="Mobile Money" required />
                </div>
                <div className="form-group mb-3">
                    <label className="form-label">{t('settings.provider', 'Fournisseur / Banque')}</label>
                    <input type="text" name="provider" className="form-input" value={formData.provider} onChange={handleChange} placeholder="Bankily" required />
                </div>
                <div className="form-group mb-3">
                    <label className="form-label">{t('settings.account_number', 'Numéro de Compte / Téléphone')}</label>
                    <input type="text" name="accountNumber" className="form-input" value={formData.accountNumber} onChange={handleChange} placeholder="+222 4X XX XX XX" required />
                </div>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%' }}>
                    <Plus size={18} /> {isSubmitting ? '...' : t('settings.add_btn', 'Ajouter le compte')}
                </button>
              </form>
          </div>

          {/* Liste des comptes */}
          <div>
              <h3 className="mb-3" style={{ paddingLeft: '10px' }}>{t('settings.active_accounts', 'Comptes Actifs')} ({methods.length})</h3>
              {methods.length === 0 ? (
                  <p style={{ paddingLeft: '10px', color: 'var(--text-muted)' }}>{t('invoices.no_data', 'Aucun compte configuré.')}</p>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {methods.map(method => (
                          <div key={method.id} className="surface flex-between" style={{ padding: '20px' }}>
                              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(67, 97, 238, 0.1)', color: 'var(--primary)' }} className="flex-center">
                                      {method.name.toLowerCase().includes('bank') || method.name.toLowerCase().includes('virement') ? <Building size={20} /> : <Smartphone size={20} />}
                                  </div>
                                  <div>
                                      <h4 style={{ margin: 0 }}>{method.provider}</h4>
                                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{method.name}</p>
                                      <p style={{ margin: '5px 0 0 0', fontWeight: 600, letterSpacing: '1px' }}>{method.accountNumber}</p>
                                  </div>
                              </div>
                              <button onClick={() => handleDelete(method.id)} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--border-color)', padding: '10px' }}>
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      ))}
                  </div>
              )}
          </div>

      </div>

      <div className="surface mt-4" style={{ borderTop: '4px solid var(--primary)', marginTop: '30px' }}>
          <h3 className="mb-3">Informations de Contact & A Propos</h3>
          <p className="mb-4 text-muted">Ces informations seront visibles par les citoyens dans la page "A Propos".</p>
          
          <form onSubmit={handleSaveContact} className="grid-cols-2">
              <div>
                  <div className="form-group mb-3">
                      <label className="form-label">Adresse de l'agence</label>
                      <input type="text" name="address" className="form-input" value={contactData.address} onChange={handleContactChange} placeholder="Ex: 123 Rue de la République..." />
                  </div>
                  <div className="form-group mb-3">
                      <label className="form-label">Numéro de Téléphone (Service Client)</label>
                      <input type="text" name="phone" className="form-input" value={contactData.phone} onChange={handleContactChange} placeholder="+222 4X XX XX XX" />
                  </div>
                  <div className="form-group mb-3">
                      <label className="form-label">Numéro WhatsApp</label>
                      <input type="text" name="whatsapp" className="form-input" value={contactData.whatsapp} onChange={handleContactChange} placeholder="+222 4X XX XX XX" />
                  </div>
                  <div className="form-group mb-3">
                      <label className="form-label">Adresse Email</label>
                      <input type="email" name="email" className="form-input" value={contactData.email} onChange={handleContactChange} placeholder="contact@finpay.com" />
                  </div>
              </div>
              <div>
                  <div className="form-group mb-3" style={{ height: '100%' }}>
                      <label className="form-label">Message "À Propos de nous" (Présentation)</label>
                      <textarea 
                          name="aboutText" 
                          className="form-input" 
                          value={contactData.aboutText} 
                          onChange={handleContactChange} 
                          placeholder="Décrivez votre structure, votre mission..." 
                          style={{ height: 'calc(100% - 30px)', minHeight: '150px', resize: 'vertical' }}
                      />
                  </div>
              </div>
              <div style={{ gridColumn: '1 / -1', textAlign: 'right', marginTop: '10px' }}>
                  <button type="submit" disabled={isSavingContact} className="btn btn-primary">
                      {isSavingContact ? 'Enregistrement...' : 'Enregistrer les informations'}
                  </button>
              </div>
          </form>
      </div>
      {/* Admin Account Management — SUPER_ADMIN only */}
      {(() => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return null;
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === 'SUPER_ADMIN') return <AdminAccountSection />;
        } catch {}
        return null;
      })()}

    </div>
  );
};

export default AdminSettings;
