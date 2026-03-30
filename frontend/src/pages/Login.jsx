import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Lock, Phone, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(newLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de connexion');
      }

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
        <p className="mb-4">{t('app_desc', 'Connectez-vous à votre espace citoyen')}</p>

        {error && (
          <div className="mb-3" style={{ padding: '10px', background: 'rgba(239, 35, 60, 0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group relative">
            <label className="form-label">Numéro de Téléphone</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
              <input 
                type="tel" 
                className="form-input" 
                style={{ [i18n.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '45px' }}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: +222 33 44 55 66"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.password', 'Mot de passe')}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                className="form-input"
                style={{ [i18n.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '45px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex-between mb-4" style={{ fontSize: '0.85rem' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" /> Se souvenir de moi
             </label>
             <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Mot de passe oublié ?</a>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? '...' : t('auth.login', 'Se connecter')}
          </button>
        </form>

        <p className="mt-4" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {t('auth.no_account', 'Pas encore de compte ?')} <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>{t('auth.register', "S'inscrire")}</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
