import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Mail, Lock, Eye, EyeOff, Globe, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Register = () => {
  const [step, setStep] = useState('register');
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: ''
  });
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (formData.password !== formData.confirmPassword) return setError('Les mots de passe ne correspondent pas.');
    setLoading(true);
    try {
      const body = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password
      };
      if (authMethod === 'phone') {
        const cleanPhone = formData.phone.replace(/\s+/g, '');
        if (cleanPhone.length !== 8) return setError('Le numéro doit comporter 8 chiffres.');
        body.phone = `+222${cleanPhone}`;
      } else {
        body.email = formData.email.toLowerCase();
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');
      setSuccessMsg(data.message);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { otpCode };
      if (authMethod === 'phone') {
        const cleanPhone = formData.phone.replace(/\s+/g, '');
        body.phone = `+222${cleanPhone}`;
      } else {
        body.email = formData.email.toLowerCase();
      }

      const res = await fetch('/api/auth/verify-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code invalide.');
      navigate('/login', { state: { message: 'Compte validé ! Vous pouvez maintenant vous connecter.' } });
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

      <div className="surface animate-fade-in" style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '10px' }}>
          {step === 'register' ? t('auth.register', 'Créer un compte') : `Vérification ${authMethod === 'phone' ? 'SMS' : 'Email'}`}
        </h2>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          {step === 'register'
            ? 'Rejoignez la plateforme citoyenne FinPay'
            : `Code envoyé à ${authMethod === 'phone' ? formData.phone : formData.email}`}
        </p>

        {error && <div className="mb-3" style={{ padding: '10px', background: 'rgba(239,35,60,0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem' }}>{error}</div>}
        {successMsg && <div className="mb-3" style={{ padding: '10px', background: 'rgba(46,204,113,0.1)', color: 'var(--success)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem' }}>{successMsg}</div>}

        {step === 'register' ? (
          <form onSubmit={handleRegisterSubmit} style={{ textAlign: 'left' }}>

            {/* Method Toggle */}
            <div style={{ display: 'flex', background: 'var(--surface-hover)', borderRadius: 'var(--border-radius-sm)', padding: '4px', marginBottom: '20px', gap: '4px' }}>
              <button type="button" onClick={() => setAuthMethod('phone')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontWeight: 600, background: authMethod === 'phone' ? 'var(--primary)' : 'transparent', color: authMethod === 'phone' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                📱 Téléphone
              </button>
              <button type="button" onClick={() => setAuthMethod('email')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontWeight: 600, background: authMethod === 'email' ? 'var(--primary)' : 'transparent', color: authMethod === 'email' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                📧 Email
              </button>
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                  <input type="text" name="firstName" className="form-input" style={{ paddingLeft: '45px' }} value={formData.firstName} onChange={handleChange} placeholder="Prénom" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                  <input type="text" name="lastName" className="form-input" style={{ paddingLeft: '45px' }} value={formData.lastName} onChange={handleChange} placeholder="Nom" required />
                </div>
              </div>
            </div>

            {authMethod === 'phone' ? (
              <div className="form-group">
                <label className="form-label">Numéro de Téléphone</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                  <span style={{ position: 'absolute', top: '15px', left: '40px', fontWeight: 'bold', color: 'var(--text-main)' }}>+222</span>
                  <input type="tel" name="phone" className="form-input" style={{ paddingLeft: '85px' }} value={formData.phone} onChange={handleChange} placeholder="33 44 55 66" maxLength={8} required />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Adresse Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                  <input type="email" name="email" className="form-input" style={{ paddingLeft: '45px' }} value={formData.email} onChange={handleChange} placeholder="vous@email.com" required />
                </div>
              </div>
            )}

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} name="password" className="form-input" style={{ paddingLeft: '45px', paddingRight: '45px' }} value={formData.password} onChange={handleChange} placeholder="••••••••" required />
                  <div style={{ position: 'absolute', top: '15px', right: '15px', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirmer Mdp</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} name="confirmPassword" className="form-input" style={{ paddingLeft: '45px' }} value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={loading}>
              {loading ? '...' : 'Créer mon compte'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ textAlign: 'left' }}>
            <div className="form-group">
              <label className="form-label">Code OTP (6 chiffres)</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                <input type="text" className="form-input" style={{ paddingLeft: '45px', fontSize: '1.2rem', letterSpacing: '4px', textAlign: 'center' }} value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="123456" maxLength="6" required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={loading}>
              {loading ? '...' : 'Valider mon compte'}
            </button>
            <button type="button" onClick={() => { setStep('register'); setError(''); setSuccessMsg(''); }} className="btn surface mt-2" style={{ width: '100%', color: 'var(--text-muted)' }}>
              Retour
            </button>
          </form>
        )}

        <p className="mt-4" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Vous avez déjà un compte ? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
