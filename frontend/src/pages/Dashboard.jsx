import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { FileText, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [kycStatus, setKycStatus] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Fetch KYC Status
        const kycRes = await fetch('/api/kyc/status', { headers });
        const kycData = await kycRes.json();
        setKycStatus(kycData);

        // 2. Fetch Invoices Summary
        const invRes = await fetch('/api/invoices/my-invoices', { headers });
        const invData = await invRes.json();
        setInvoices(invData);
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>{t('status.pending', 'Chargement...')}</div>;

  const totalUnpaid = invoices.reduce((acc, inv) => {
      if (['APPROVED', 'FEE_VERIFYING', 'READY_TO_PAY', 'PAID'].includes(inv.status) && inv.repaymentPlan) {
          const unpaidInstallments = inv.repaymentPlan.installments.filter(i => i.status !== 'PAID');
          return acc + unpaidInstallments.reduce((sum, i) => sum + i.amount + (i.dynamicPenalty || 0), 0);
      }
      return acc;
  }, 0);

  let nextInstallment = null;
  invoices.forEach(inv => {
    if (['APPROVED', 'FEE_VERIFYING', 'READY_TO_PAY', 'PAID'].includes(inv.status) && inv.repaymentPlan) {
      inv.repaymentPlan.installments.forEach(i => {
        if (i.status !== 'PAID') {
          const dueDate = new Date(i.dueDate);
          if (!nextInstallment || dueDate < nextInstallment.dueDateObj) {
            nextInstallment = {
              ...i,
              dueDateObj: dueDate,
              totalAmount: i.amount + (i.dynamicPenalty || 0)
            };
          }
        }
      });
    }
  });

  const pendingInvoicesCount = invoices.filter(i => i.status === 'PENDING').length;

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <div>
           <h1 style={{ color: 'var(--primary)' }}>{t('dashboard.welcome', 'Bonjour')}, {user.firstName}</h1>
           <p>{t('dashboard.summary', 'Voici un récapitulatif de votre compte FinPay.')}</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="surface" style={{ padding: '8px 20px', textAlign: 'center', borderBottom: '3px solid var(--success)' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Credit Score</p>
            <h2 style={{ margin: 0, color: 'var(--success)', fontSize: '1.5rem' }}>{user.creditScore || 100}</h2>
          </div>
          <Link to="/submit-invoice" className="btn btn-primary">{t('menu.submit_invoice', 'Soumettre une facture')}</Link>
        </div>
      </div>

      {/* Alerte KYC */}
      {(!kycStatus || kycStatus.status === 'NOT_SUBMITTED') && (
        <div className="surface mb-4" style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(248, 150, 30, 0.05)' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <AlertCircle color="var(--warning)" size={32} />
            <div style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '5px' }}>{t('kyc.title', "Vérification d'identité requise")}</h3>
              <p style={{ fontSize: '0.9rem' }}>{t('kyc.desc', 'Vous devez vérifier votre identité avant de pouvoir soumettre des factures.')}</p>
            </div>
            <Link to="/kyc" className="btn btn-outline" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}>KYC</Link>
          </div>
        </div>
      )}

      {kycStatus?.status === 'PENDING' && (
        <div className="surface mb-4" style={{ borderLeft: '4px solid var(--primary)', background: 'rgba(67, 97, 238, 0.05)' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <Clock color="var(--primary)" size={32} />
            <div>
              <h3 style={{ marginBottom: '5px' }}>{t('kyc.status_pending', 'KYC en cours de validation')}</h3>
              <p style={{ fontSize: '0.9rem' }}>{t('kyc.status_pending', "Vos documents sont en cours d'examen par notre équipe.")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques Rapides */}
      <div className="grid-cols-4 mb-4">
        <div className="surface" style={{ borderTop: '4px solid var(--primary)' }}>
          <p className="form-label" style={{ color: 'var(--text-muted)' }}>{t('dashboard.remaining_debt', 'Reste à payer')}</p>
          <h2 style={{ fontSize: '2rem', margin: '10px 0' }}>{totalUnpaid.toFixed(2)} MRU</h2>
          <p style={{ fontSize: '0.8rem' }} className="badge badge-primary">{t('repayment.installment', 'Échéances futures')}</p>
        </div>

        <div className="surface" style={{ borderTop: '4px solid var(--danger)' }}>
          <p className="form-label" style={{ color: 'var(--text-muted)' }}>{t('dashboard.next_due', 'Prochaine échéance')}</p>
          <h2 style={{ fontSize: '2rem', margin: '10px 0' }}>{nextInstallment ? nextInstallment.totalAmount.toFixed(2) : '0.00'} MRU</h2>
          <p style={{ fontSize: '0.8rem' }} className="badge badge-danger">
            {nextInstallment ? new Date(nextInstallment.dueDate).toLocaleDateString() : t('dashboard.no_due', 'Aucune')}
          </p>
        </div>

        <div className="surface" style={{ borderTop: '4px solid var(--warning)' }}>
          <p className="form-label" style={{ color: 'var(--text-muted)' }}>{t('status.pending', 'Factures en attente')}</p>
          <h2 style={{ fontSize: '2rem', margin: '10px 0' }}>{pendingInvoicesCount}</h2>
          <p style={{ fontSize: '0.8rem' }} className="badge badge-pending">{t('status.pending', 'En cours de révision')}</p>
        </div>

        <div className="surface" style={{ borderTop: '4px solid var(--success)' }}>
           <p className="form-label" style={{ color: 'var(--text-muted)' }}>{t('status.approved', 'Factures traitées')}</p>
           <h2 style={{ fontSize: '2rem', margin: '10px 0' }}>{invoices.length - pendingInvoicesCount}</h2>
           <p style={{ fontSize: '0.8rem' }} className="badge badge-success">{t('status.approved', 'Acceptées ou terminées')}</p>
        </div>
      </div>

      {/* Activité Récente (Factures) */}
      <h3 className="mb-2">{t('dashboard.recent_activity', 'Activité récente')}</h3>
      <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
        {invoices.length === 0 ? (
           <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ opacity: 0.5, marginBottom: '15px' }} />
              <p>{t('dashboard.no_invoices', "Vous n'avez soumis aucune facture.")}</p>
           </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>{t('invoices.ref_number', 'Facture')}</th>
                <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>{t('invoices.provider', 'Fournisseur')}</th>
                <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>{t('invoices.amount', 'Montant')}</th>
                <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>{t('status.pending', 'Statut')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 5).map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px 20px' }}>
                    <div style={{ fontWeight: 500 }}>{inv.invoiceNumber}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(inv.submittedAt).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '15px 20px', textTransform: 'capitalize' }}>{inv.provider}</td>
                  <td style={{ padding: '15px 20px', fontWeight: 600 }}>{inv.amount.toFixed(2)} MRU</td>
                  <td style={{ padding: '15px 20px' }}>
                    <span className={`badge badge-${inv.status === 'PENDING' ? 'pending' : inv.status === 'APPROVED' ? 'primary' : 'success'}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
