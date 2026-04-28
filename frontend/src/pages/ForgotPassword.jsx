import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Mail, Lock, Key, Globe, EyeOff, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ForgotPassword = () => {
  const [step, setStep] = useState('request'); // 'request', 'verify_reset'
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const body = {};
      if (authMethod === 'phone') {
        const cleanPhone = identifier.replace(/\s+/g, '');
        if (cleanPhone.length !== 8) return setError('Le numéro doit comporter 8 chiffres.');
        body.phone = `+222${cleanPhone}`;
      } else {
        body.email = identifier.toLowerCase();
      }

      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la demande.');
      
      setSuccessMsg(data.message);
      setStep('verify_reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { otpCode, newPassword };
      if (authMethod === 'phone') {
        const cleanPhone = identifier.replace(/\s+/g, '');
        body.phone = `+222${cleanPhone}`;
      } else {
        body.email = identifier.toLowerCase();
      }

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code invalide ou erreur réseau.');
      
      navigate('/login', { state: { message: 'Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '20px', position: 'relative' }}>
      <button onClick={toggleLanguage} className="btn surface" style={{ position: 'absolute', top: '20px', right: '20px', padding: '10px 15px' }}>
        <Globe size={18} /> {i18n.language === 'fr' ? 'العربية' : 'Français'}
      </button>

      <div className="surface animate-fade-in" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '10px' }}>
          {step === 'request' ? 'Mot de passe oublié' : 'Réinitialisation'}
        </h2>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          {step === 'request'
            ? 'Entrez vos informations pour recevoir un code de récupération.'
            : 'Entrez le code envoyé à ' + (authMethod === 'phone' ? '+222 ' + identifier : identifier)}
        </p>

        {error && <div className="mb-3" style={{ padding: '10px', background: 'rgba(239,35,60,0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem' }}>{error}</div>}
        {successMsg && <div className="mb-3" style={{ padding: '10px', background: 'rgba(46,204,113,0.1)', color: 'var(--success)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem' }}>{successMsg}</div>}

        {step === 'request' ? (
          <form onSubmit={handleRequestOtp} style={{ textAlign: 'left' }}>
            {/* Method Toggle */}
            <div style={{ display: 'flex', background: 'var(--surface-hover)', borderRadius: 'var(--border-radius-sm)', padding: '4px', marginBottom: '20px', gap: '4px' }}>
              <button type="button" onClick={() => { setAuthMethod('phone'); setIdentifier(''); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontWeight: 600, background: authMethod === 'phone' ? 'var(--primary)' : 'transparent', color: authMethod === 'phone' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                📱 Téléphone
              </button>
              <button type="button" onClick={() => { setAuthMethod('email'); setIdentifier(''); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontWeight: 600, background: authMethod === 'email' ? 'var(--primary)' : 'transparent', color: authMethod === 'email' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                📧 Email
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">{authMethod === 'phone' ? 'Numéro de Téléphone' : 'Adresse Email'}</label>
              <div style={{ position: 'relative' }}>
                {authMethod === 'phone'
                  ? <Phone size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                  : <Mail size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                }
                {authMethod === 'phone' && (
                  <span style={{ position: 'absolute', top: '15px', left: '40px', fontWeight: 'bold', color: 'var(--text-main)' }}>🇲🇷 +222</span>
                )}
                <input
                  type={authMethod === 'phone' ? 'tel' : 'email'}
                  className="form-input"
                  style={{ paddingLeft: authMethod === 'phone' ? '110px' : '45px' }}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={authMethod === 'phone' ? '33 44 55 66' : 'vous@email.com'}
                  maxLength={authMethod === 'phone' ? 8 : undefined}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={loading}>
              {loading ? '...' : 'Recevoir le code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={{ textAlign: 'left' }}>
            <div className="form-group">
              <label className="form-label">Code OTP (6 chiffres)</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                <input type="text" className="form-input" style={{ paddingLeft: '45px', fontSize: '1.2rem', letterSpacing: '4px', textAlign: 'center' }} value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="123456" maxLength="6" required />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                <input type={showPassword ? 'text' : 'password'} className="form-input" style={{ paddingLeft: '45px', paddingRight: '45px' }} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required />
                <div style={{ position: 'absolute', top: '15px', right: '15px', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={loading}>
              {loading ? '...' : 'Réinitialiser le mot de passe'}
            </button>
            <button type="button" onClick={() => { setStep('request'); setError(''); setSuccessMsg(''); }} className="btn surface mt-2" style={{ width: '100%', color: 'var(--text-muted)' }}>
              Retour
            </button>
          </form>
        )}

        <p className="mt-4" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Retourner à l'accueil</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
