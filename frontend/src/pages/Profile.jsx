import { useState, useEffect, useContext } from 'react';
import { User, Phone, Mail, Shield, Star, Key } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('idle'); // 'idle' | 'otp'
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user: authUser } = useContext(AuthContext);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setProfile(data);
    if (data.phone) setPhone(data.phone);
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleAddPhone = async (e) => {
    e.preventDefault();
    setErr(''); setMsg(''); setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/add-phone', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.message);
      setStep('otp');
    } catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErr(''); setMsg(''); setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/verify-phone-otp', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode: otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg('✅ ' + data.message);
      setStep('idle');
      fetchProfile();
    } catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>Chargement...</div>;

  const kycBadge = {
    APPROVED: { label: 'Vérifié ✓', color: 'var(--success)' },
    PENDING: { label: 'En attente', color: 'var(--warning)' },
    REJECTED: { label: 'Refusé', color: 'var(--danger)' },
    NOT_SUBMITTED: { label: 'Non soumis', color: 'var(--text-muted)' }
  }[profile?.kyc?.status || 'NOT_SUBMITTED'];

  return (
    <div className="animate-fade-in">
      <h1 className="mb-2" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <User /> Mon Profil
      </h1>
      <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Gérez vos informations personnelles et vérifiez votre numéro de téléphone.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* User Info Card */}
        <div className="surface">
          <h3 className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={18} color="var(--primary)" /> Informations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Nom complet</span>
              <strong>{profile?.firstName} {profile?.lastName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}><Mail size={14} style={{ verticalAlign: 'middle' }} /> Email</span>
              <strong>{profile?.email || '—'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}><Phone size={14} style={{ verticalAlign: 'middle' }} /> Téléphone</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong>{profile?.phone || 'Non ajouté'}</strong>
                {profile?.phone && (
                  <span style={{ fontSize: '0.75rem', color: profile?.isPhoneVerified ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                    {profile?.isPhoneVerified ? '✓ Vérifié' : '⚠ Non vérifié'}
                  </span>
                )}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ color: 'var(--text-muted)' }}><Shield size={14} style={{ verticalAlign: 'middle' }} /> Statut KYC</span>
              <span style={{ color: kycBadge.color, fontWeight: 600 }}>{kycBadge.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}><Star size={14} style={{ verticalAlign: 'middle' }} /> Score de crédit</span>
              <strong style={{ color: 'var(--success)' }}>{profile?.creditScore} pts</strong>
            </div>
          </div>
        </div>

        {/* Phone Verification Card */}
        <div className="surface">
          <h3 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={18} color="var(--primary)" /> Vérification Téléphone</h3>

          {profile?.isPhoneVerified ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--success)' }}>
              <div style={{ fontSize: '3rem' }}>✅</div>
              <p style={{ fontWeight: 600, marginTop: '10px' }}>Téléphone vérifié</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Vous pouvez accéder aux plans de paiement après approbation de facture.</p>
            </div>
          ) : (
            <>
              {/* Warning Banner */}
              <div style={{ background: 'rgba(248,150,30,0.1)', border: '1px solid rgba(248,150,30,0.3)', borderRadius: 'var(--border-radius-sm)', padding: '12px', marginBottom: '20px', fontSize: '0.85rem', color: '#f8961e' }}>
                ⚠️ <strong>Requis pour le financement :</strong> Vous devez vérifier votre numéro de téléphone pour accéder aux détails de paiement après approbation de vos factures.
              </div>

              {err && <div style={{ padding: '10px', background: 'rgba(239,35,60,0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)', marginBottom: '10px', fontSize: '0.9rem' }}>{err}</div>}
              {msg && <div style={{ padding: '10px', background: 'rgba(23,195,178,0.1)', color: 'var(--success)', borderRadius: 'var(--border-radius-sm)', marginBottom: '10px', fontSize: '0.9rem' }}>{msg}</div>}

              {step === 'idle' ? (
                <form onSubmit={handleAddPhone}>
                  <div className="form-group">
                    <label className="form-label">Numéro de téléphone</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                      <input type="tel" className="form-input" style={{ paddingLeft: '45px' }} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+222 33 44 55 66" required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                    {submitting ? '...' : '📲 Envoyer le code SMS'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
                    Code envoyé par SMS au <strong>{phone}</strong>
                  </p>
                  <div className="form-group">
                    <label className="form-label">Code OTP (6 chiffres)</label>
                    <div style={{ position: 'relative' }}>
                      <Key size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                      <input type="text" className="form-input" style={{ paddingLeft: '45px', fontSize: '1.2rem', letterSpacing: '4px', textAlign: 'center' }} value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" maxLength="6" required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                    {submitting ? '...' : '✅ Vérifier mon numéro'}
                  </button>
                  <button type="button" onClick={() => setStep('idle')} className="btn surface mt-2" style={{ width: '100%', color: 'var(--text-muted)' }}>
                    Changer le numéro
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
