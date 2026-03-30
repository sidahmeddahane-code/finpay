import { useContext } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { LayoutDashboard, FileText, UploadCloud, Users, LogOut, ShieldCheck, Clock, CheckCircle, Wallet, Settings, CheckSquare, Globe, Banknote, Info, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DashboardLayout = () => {
  const { user, logout, loading } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'ar' : 'fr';
    i18n.changeLanguage(newLang);
  };

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}>Chargement...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
  };

  const navItemClass = (path) => {
    const isActive = location.pathname === path;
    return `btn ${isActive ? 'btn-primary' : 'btn-outline'} mb-2`;
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--primary)' }}>FinPay</h2>
          <p style={{ fontSize: '0.8rem' }}>Plateforme Citoyenne</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {user.role === 'USER' && (
            <>
              <Link to="/dashboard" className={navItemClass('/dashboard')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <LayoutDashboard size={18} /> {t('menu.overview', 'Accueil')}
              </Link>
              <Link to="/submit-invoice" className={navItemClass('/submit-invoice')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <UploadCloud size={18} /> {t('menu.submit_invoice', 'Soumettre Facture')}
              </Link>
              <Link to="/my-invoices" className={navItemClass('/my-invoices')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <FileText size={18} /> {t('menu.my_requests', 'Mes Demandes')}
              </Link>
              <Link to="/about" className={navItemClass('/about')} style={{ width: '100%', justifyContent: 'flex-start', marginTop: '15px' }}>
                <Info size={18} /> {t('menu.about', 'À Propos & Contact')}
              </Link>
            </>
          )}

          {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
            <>
              <Link to="/admin/dashboard" className={navItemClass('/admin/dashboard')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <LayoutDashboard size={18} /> {t('menu.overview', "Vue d'ensemble")}
              </Link>
              <Link to="/admin/users" className={navItemClass('/admin/users')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Users size={18} /> {t('menu.users', 'Utilisateurs')}
              </Link>
              <Link to="/admin/kyc" className={navItemClass('/admin/kyc')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Users size={18} /> {t('menu.kyc_validation', 'Validations KYC')}
              </Link>
              <Link to="/admin/invoices" className={navItemClass('/admin/invoices')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <CheckSquare size={18} /> {t('menu.invoice_mod', 'Modération Factures')}
              </Link>
              <Link to="/admin/payments" className={navItemClass('/admin/payments')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Wallet size={18} /> {t('menu.proofs', 'Preuves Paiements')}
              </Link>
              <Link to="/admin/expenses" className={navItemClass('/admin/expenses')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Banknote size={18} /> {t('menu.expenses', 'Dépenses & Charges')}
              </Link>
              <Link to="/admin/settings" className={navItemClass('/admin/settings')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Settings size={18} /> {t('menu.settings', 'Comptes FinPay')}
              </Link>
              <Link to="/about" className={navItemClass('/about')} style={{ width: '100%', justifyContent: 'flex-start', marginTop: '15px' }}>
                <Info size={18} /> {t('menu.about', 'Aperçu À Propos')}
              </Link>
              {user.role === 'SUPER_ADMIN' && (
                <Link to="/admin/logs" className={navItemClass('/admin/logs')} style={{ width: '100%', justifyContent: 'flex-start', marginTop: '6px', borderColor: '#f59e0b', color: navItemClass('/admin/logs').includes('btn-primary') ? undefined : '#f59e0b' }}>
                  <ClipboardList size={18} /> Historique Admin
                </Link>
              )}
            </>
          )}

          <div style={{ marginTop: 'auto' }}>
             
             <button onClick={toggleLanguage} className="btn surface mb-3" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '10px', background: 'var(--surface-light)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '10px' }}>
                 <Globe size={18} /> {i18n.language === 'fr' ? 'العربية' : 'Français'}
             </button>

             <div className="surface mb-3" style={{ padding: '15px' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>{user.firstName} {user.lastName}</p>
                <p style={{ fontSize: '0.8rem' }}>{user.email}</p>
             </div>
            <button onClick={handleLogout} className="btn btn-outline" style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
              <LogOut size={18} /> {t('menu.logout', 'Déconnexion')}
            </button>
          </div>
        </nav>
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
