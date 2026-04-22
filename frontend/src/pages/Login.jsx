import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Lock, Phone, Mail, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'ar' : 'fr');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = { password };
      if (authMethod === 'phone') {
        const cleanPhone = identifier.replace(/\s+/g, '');
        if (cleanPhone.length !== 8) return setError('Le numéro doit comporter 8 chiffres.');
        body.phone = `+222${cleanPhone}`;
      } else {
        body.email = identifier.toLowerCase();
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de connexion');
      login(data.user, data.token);
      if (data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
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
        <h2 style={{ color: 'var(--primary)', marginBottom: '10px' }}>{t('app_name', 'FinPay')}</h2>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Connectez-vous à votre espace citoyen</p>

        {error && (
          <div className="mb-3" style={{ padding: '10px', background: 'rgba(239,35,60,0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Method Toggle */}
        <div style={{ display: 'flex', background: 'var(--surface-hover)', borderRadius: 'var(--border-radius-sm)', padding: '4px', marginBottom: '20px', gap: '4px' }}>
          <button type="button" onClick={() => { setAuthMethod('phone'); setIdentifier(''); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontWeight: 600, background: authMethod === 'phone' ? 'var(--primary)' : 'transparent', color: authMethod === 'phone' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
            📱 Téléphone
          </button>
          <button type="button" onClick={() => { setAuthMethod('email'); setIdentifier(''); }} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontWeight: 600, background: authMethod === 'email' ? 'var(--primary)' : 'transparent', color: authMethod === 'email' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
            📧 Email
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label">
              {authMethod === 'phone' ? 'Numéro de Téléphone' : 'Adresse Email'}
            </label>
            <div style={{ position: 'relative' }}>
              {authMethod === 'phone'
                ? <Phone size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
                : <Mail size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
              }
              {authMethod === 'phone' && (
                <span style={{ position: 'absolute', top: '15px', left: '40px', fontWeight: 'bold', color: 'var(--text-main)' }}>+222</span>
              )}
              <input
                type={authMethod === 'phone' ? 'tel' : 'email'}
                className="form-input"
                style={{ paddingLeft: authMethod === 'phone' ? '85px' : '45px' }}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={authMethod === 'phone' ? '33 44 55 66' : 'vous@email.com'}
                maxLength={authMethod === 'phone' ? 8 : undefined}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.password', 'Mot de passe')}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '15px', left: '15px', color: 'var(--text-muted)' }} />
              <input type="password" className="form-input" style={{ paddingLeft: '45px' }} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
               <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>Mot de passe oublié ?</Link>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '...' : t('auth.login', 'Se connecter')}
          </button>
        </form>

        <p className="mt-4" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Pas encore de compte ? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>S'inscrire</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
