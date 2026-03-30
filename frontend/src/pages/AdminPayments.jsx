import { useState, useEffect } from 'react';
import { ZoomIn, Check, X, CreditCard, ExternalLink } from 'lucide-react';
import UserHistoryModal from '../components/UserHistoryModal';
import { useTranslation } from 'react-i18next';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const { t } = useTranslation();

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Trier: PENDING d'abord
      data.sort((a, b) => {
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          return new Date(b.paidAt) - new Date(a.paidAt);
      });
      
      setPayments(data);
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleReview = async (paymentId, status) => {
      setActionLoading(true);
      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/admin/payments/${paymentId}/review`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        await fetchPayments();
      } catch (error) {
          console.error(error);
          alert('Erreur validation du paiement.');
      } finally {
          setActionLoading(false);
      }
  }

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>{t('status.pending', 'Chargement...')}</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="mb-2" style={{ color: 'var(--primary)' }}>{t('menu.admin_payments', 'Preuves de Remboursement')}</h1>
      <p className="mb-4" style={{ color: 'var(--text-muted)' }}>{t('kyc.admin_desc', "Contrôlez les reçus et captures d'écran soumis par les citoyens pour valider leurs échéances.")}</p>

      {/* Modal Image Simple */}
      {selectedImage && (
          <div 
            onClick={() => setSelectedImage(null)}
            style={{ 
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
                background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', 
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
            }}
          >
              <img src={`${selectedImage}`} alt="Zoom document" style={{ maxHeight: '90vh', maxWidth: '90vw', borderRadius: '8px' }} />
          </div>
      )}

      {payments.length === 0 ? (
          <p>{t('invoices.no_data', 'Aucun paiement soumis pour le moment.')}</p>
      ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             {payments.map(payment => (
                <div key={payment.id} className="surface" style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                   
                   {/* Info basique */}
                   <div style={{ flex: 1 }}>
                       <div className="flex-between mb-2">
                           <h3><span onClick={() => setSelectedUserId(payment.installment.plan.invoice.user.id)} style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}>{payment.installment.plan.invoice.user.firstName} {payment.installment.plan.invoice.user.lastName}</span></h3>
                           <span className={`badge badge-${payment.status === 'APPROVED' ? 'success' : payment.status === 'PENDING' ? 'pending' : 'danger'}`}>
                              {payment.status}
                           </span>
                       </div>
                       <p className="mb-1" style={{ fontSize: '0.9rem' }}>
                           <strong>{t('invoices.ref_number', 'Facture')} :</strong> {payment.installment.plan.invoice.provider} ({payment.installment.plan.invoice.category})
                       </p>
                       <p className="mb-1" style={{ fontSize: '0.9rem' }}>
                           <strong>{t('repayment.account', 'Méthode')} :</strong> {payment.method}
                       </p>
                       <p className="mb-1" style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                           <strong>{t('repayment.amount', 'Montant dû')} :</strong> {payment.amount.toFixed(2)} MRU
                       </p>
                       <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('repayment.due_for', 'Soumis le')} {new Date(payment.paidAt).toLocaleString()}</p>
                   </div>

                   {/* Médias */}
                   <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                       <div style={{ textAlign: 'center' }}>
                         <p style={{ fontSize: '0.8rem', marginBottom: '5px' }}>{t('repayment.proof', 'Preuve')}</p>
                         
                         {payment.proofUrl ? (
                             payment.proofUrl.toLowerCase().endsWith('.pdf') ? (
                                <a href={`${payment.proofUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ height: '80px', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
                                    <ExternalLink size={24} /> Voir PDF
                                </a>
                             ) : (
                                <div 
                                onClick={() => setSelectedImage(payment.proofUrl)}
                                style={{ width: '120px', height: '80px', background: '#eee', borderRadius: '4px', cursor: 'pointer', backgroundImage: `url(${payment.proofUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}
                                >
                                   <ZoomIn size={16} style={{ position: 'absolute', bottom: '5px', right: '5px', color: 'white', filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.8))' }} />
                                </div>
                             )
                         ) : (
                             <div style={{ width: '120px', height: '80px', background: '#f5f5f5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.8rem' }}>{t('invoices.no_data', 'Aucune')}</div>
                         )}
                       </div>
                   </div>

                   {/* Actions */}
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px' }}>
                       {payment.status === 'PENDING' && (
                           <>
                           <button onClick={() => handleReview(payment.id, 'APPROVED')} disabled={actionLoading} className="btn btn-primary" style={{ background: 'var(--success)', border: 'none', padding: '8px' }}>
                               <Check size={18} /> {t('status.approved', 'Valider')}
                           </button>
                           <button onClick={() => handleReview(payment.id, 'REJECTED')} disabled={actionLoading} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '8px' }}>
                               <X size={18} /> {t('status.rejected', 'Refuser')}
                           </button>
                           </>
                       )}
                   </div>

                </div>
             ))}
          </div>
      )}
      {selectedUserId && <UserHistoryModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
};

export default AdminPayments;
