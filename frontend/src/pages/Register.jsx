import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Phone, Lock, Eye, EyeOff, Globe, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Register = () => {
  const [step, setStep] = useState('register'); // 'register' or 'otp'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(newLang);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Les mots de passe ne correspondent pas.');
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          password: formData.password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription');
      }

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
      const res = await fetch('/api/auth/verify-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          otpCode: otpCode
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code invalide.');

      navigate('/login', { state: { message: 'Compte validé avec succès ! Vous pouvez maintenant vous connecter.' } });
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
          {step === 'register' ? t('auth.register', "Créer un compte") : "Vérification SMS"}
        </h2>
        <p className="mb-4">
          {step === 'register' ? t('app_desc', 'Rejoignez la plateforme citoyenne FinPay') : `Entrez le code envoyé au ${formData.phone}`}
        </p>

        {error && (
          <div className="mb-3" style={{ padding: '10px', background: 'rgba(239, 35, 60, 0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-3" style={{ padding: '10px', background: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem' }}>
            {successMsg}
          </div>
        )}

        {step === 'register' ? (
          <form onSubmit={handleRegisterSubmit} style={{ textAlign: 'left' }}>
            <div className="grid-cols-2">
              <div className="form-group relative">
                <label className="form-label">Prénom</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
                  <input type="text" name="firstName" className="form-input" style={{ [i18n.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '45px' }} value={formData.firstName} onChange={handleChange} placeholder="Jean" required />
                </div>
              </div>

              <div className="form-group relative">
                <label className="form-label">Nom</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
                  <input type="text" name="lastName" className="form-input" style={{ [i18n.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '45px' }} value={formData.lastName} onChange={handleChange} placeholder="Dupont" required />
                </div>
              </div>
            </div>

            <div className="form-group relative">
              <label className="form-label">Numéro de Téléphone</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
                <input type="tel" name="phone" className="form-input" style={{ [i18n.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '45px' }} value={formData.phone} onChange={handleChange} placeholder="+222 33 44 55 66" required />
              </div>
            </div>

            <div className="grid-cols-2">
                <div className="form-group">
                  <label className="form-label">{t('auth.password', 'Mot de passe')}</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
                    <input type={showPassword ? "text" : "password"} name="password" className="form-input" style={{ paddingLeft: '45px', paddingRight: '45px' }} value={formData.password} onChange={handleChange} placeholder="••••••••" required />
                    <div style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'left' : 'right']: '15px', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirmer Mdp</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
                    <input type={showPassword ? "text" : "password"} name="confirmPassword" className="form-input" style={{ [i18n.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '45px' }} value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
                  </div>
                </div>
            </div>

            <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={loading}>
              {loading ? '...' : t('auth.register', "Créer mon compte")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ textAlign: 'left' }}>
            <div className="form-group relative">
              <label className="form-label">Code OTP (6 chiffres)</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '45px', fontSize: '1.2rem', letterSpacing: '2px', textAlign: 'center' }}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength="6"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={loading}>
              {loading ? '...' : 'Valider mon compte'}
            </button>
            <button type="button" onClick={() => {setStep('register'); setError(''); setSuccessMsg('');}} className="btn surface mt-2" style={{ width: '100%', color: 'var(--text-muted)' }}>
              Retour
            </button>
          </form>
        )}

        <p className="mt-4" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {t('auth.has_account', 'Vous avez déjà un compte ?')} <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>{t('auth.login', 'Se connecter')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
