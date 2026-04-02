import { useState, useEffect } from 'react';
import { Download, Check, X, CreditCard } from 'lucide-react';
import UserHistoryModal from '../components/UserHistoryModal';
import { useTranslation } from 'react-i18next';
import { exportToCSV } from '../utils/exportCsv';

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const { t } = useTranslation();

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error('Erreur chargement factures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleExport = () => {
    const rows = invoices.map(inv => ({
      'N° Facture': inv.invoiceNumber || '',
      'Prestataire': inv.provider || '',
      'Catégorie': inv.category || '',
      'Montant (MRU)': inv.amount?.toFixed(2) || '',
      'Statut': inv.status || '',
      'Utilisateur': `${inv.user?.firstName || ''} ${inv.user?.lastName || ''}`.trim(),
      'Téléphone': inv.user?.phone || '',
      'Email': inv.user?.email || '',
      'Plan (Durée)': inv.repaymentPlan ? `${inv.repaymentPlan.duration} ${inv.repaymentPlan.durationType === 'DAYS' ? 'Jours' : 'Mois'}` : '',
      'Frais (%)': inv.repaymentPlan?.feePercentage || '',
      'Total Remboursé (MRU)': inv.repaymentPlan?.totalAmount?.toFixed(2) || '',
      'Date Soumission': new Date(inv.submittedAt).toLocaleDateString(),
      'Date Échéance': inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '',
    }));
    exportToCSV(rows, 'factures_finpay');
  };

  const handleReview = async (invoiceId, status) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir ${status === 'APPROVED' ? 'approuver' : 'refuser'} cette facture ?`)) return;
    
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/invoices/${invoiceId}/review`, {
          method: 'POST',
          headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
      });
      await fetchInvoices();
    } catch (error) {
        console.error(error);
        alert('Erreur modération facture.');
    } finally {
        setActionLoading(false);
    }
  };

  const handleRequestInfo = async (invoiceId) => {
    const requestedDocs = window.prompt("Quels documents supplémentaires demandez-vous ?\n(Ex: Fiche de paie, Contrat de travail...)");
    if (!requestedDocs || requestedDocs.trim() === '') return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/invoices/${invoiceId}/request-info`, {
          method: 'POST',
          headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ requestedDocs })
      });
      if(!res.ok) throw new Error('Erreur lors de la demande d\'infos');
      await fetchInvoices();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const [uploadFile, setUploadFile] = useState(null);

  const handlePayInvoice = async (invoiceId) => {
    if (!uploadFile) return alert("Veuillez uploader la preuve de transfert au fournisseur.");
    if (!window.confirm("Confirmez-vous le paiement de cette facture au fournisseur par FinPay ? Cela débloquera l'option d'échelonnement pour le client.")) return;
    
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('paymentProof', uploadFile);

      const token = localStorage.getItem('token');
      await fetch(`/api/admin/invoices/${invoiceId}/pay`, {
          method: 'POST',
          headers: { 
              'Authorization': `Bearer ${token}`
          },
          body: formData
      });
      setUploadFile(null);
      await fetchInvoices();
    } catch (error) {
        console.error(error);
        alert('Erreur lors du paiement.');
    } finally {
        setActionLoading(false);
    }
  };

  const handleReviewFee = async (planId, status) => {
    if (!window.confirm(`Voulez-vous ${status === 'APPROVED' ? 'valider' : 'refuser'} les frais initiaux pour ce plan ?`)) return;
    
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/admin/repayment-plans/${planId}/review-fee`, {
          method: 'POST',
          headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
      });
      await fetchInvoices();
    } catch (error) {
        console.error(error);
        alert('Erreur lors de la validation des frais.');
    } finally {
        setActionLoading(false);
    }
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>{t('status.pending', 'Chargement...')}</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <div>
          <h1 className="mb-2" style={{ color: 'var(--primary)' }}>{t('menu.admin_invoices', 'Modération des Factures')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('kyc.admin_desc', 'Examinez, validez et procédez au paiement des prestataires pour le compte des citoyens.')}</p>
        </div>
        <button onClick={handleExport} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <Download size={16} /> Exporter CSV
        </button>
      </div>

      {invoices.length === 0 ? (
          <p>{t('invoices.no_data', 'Aucune facture soumise.')}</p>
      ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             {invoices.map(invoice => (
                <div key={invoice.id} className="surface" style={{ padding: '25px', display: 'flex', gap: '20px', flexDirection: 'column' }}>
                   
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                       <div>
                           <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                              <h3 style={{ textTransform: 'capitalize', margin: 0 }}>{invoice.provider}</h3>
                              <span className={`badge badge-${invoice.status === 'PENDING' ? 'pending' : invoice.status === 'REJECTED' ? 'danger' : invoice.status === 'FEE_VERIFYING' || invoice.status === 'READY_TO_PAY' ? 'warning' : 'success'}`}>
                                  {invoice.status}
                              </span>
                           </div>
                           <p className="mb-1"><strong>Citoyen:</strong> <span onClick={() => setSelectedUserId(invoice.user.id)} style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}>{invoice.user.firstName} {invoice.user.lastName}</span> ({invoice.user.email})</p>
                           <p className="mb-1"><strong>{t('invoices.ref_number', 'Référence')}:</strong> {invoice.invoiceNumber} | <strong>{t('invoices.category', 'Catégorie')}:</strong> {invoice.category}</p>
                           <p className="mb-1"><strong>{t('invoices.due_date', 'Échéance')}:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
                           <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('repayment.due_for', 'Soumis le')} {new Date(invoice.submittedAt).toLocaleDateString()}</p>
                       </div>
                       
                       <div style={{ textAlign: 'right' }}>
                           <h2 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>{invoice.amount.toFixed(2)} MRU</h2>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                <a href={`${invoice.documentUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '8px 15px', fontSize: '0.85rem' }}>
                                   <Download size={16} /> {t('invoices.see_doc', 'Justificatif')}
                                </a>
                                {invoice.additionalDocUrl && (
                                    <a href={`${invoice.additionalDocUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.85rem', background: 'var(--primary)', color: 'white' }}>
                                       <Download size={16} /> Doc Supp. Reçu
                                    </a>
                                )}
                            </div>
                       </div>
                   </div>

                   <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                       
                       {/* Actions selon le statut */}
                       {invoice.status === 'PENDING' && (
                           <>
                               <button onClick={() => handleReview(invoice.id, 'REJECTED')} disabled={actionLoading} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                                   <X size={18} /> {t('status.rejected', 'Refuser')}
                               </button>
                               <button onClick={() => handleRequestInfo(invoice.id)} disabled={actionLoading} className="btn btn-outline" style={{ color: '#f59e0b', borderColor: '#f59e0b' }}>
                                   Demander Infos
                               </button>
                               <button onClick={() => handleReview(invoice.id, 'APPROVED')} disabled={actionLoading} className="btn btn-primary" style={{ background: 'var(--success)', border: 'none' }}>
                                   <Check size={18} /> {t('status.approved', 'Approuver')}
                               </button>
                           </>
                       )}

                       {/* Si en attente de docs additionnels */}
                       {invoice.status === 'INFO_REQUIRED' && (
                           <div style={{ padding: '10px', color: '#f59e0b', fontWeight: 500 }}>
                               En attente du document supplémentaire: "{invoice.requestedDocs}"
                           </div>
                       )}

                       {/* Si approuvé mais plan non encore choisi */}
                       {invoice.status === 'APPROVED' && (
                           <div style={{ padding: '10px', color: 'var(--text-muted)' }}>
                               En attente du choix de plan et de la soumission des frais par le client.
                           </div>
                       )}

                       {/* Cas où le client a soumis son plan et la preuve des frais */}
                       {invoice.status === 'FEE_VERIFYING' && invoice.repaymentPlan && (
                           <div style={{ background: 'rgba(248, 150, 30, 0.05)', padding: '15px', borderRadius: 'var(--border-radius-sm)', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(248, 150, 30, 0.2)' }}>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 500, color: '#f8961e' }}>Vérification des Frais Initiaux Requis</p>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Durée: {invoice.repaymentPlan.duration} {invoice.repaymentPlan.durationType === 'DAYS' ? 'Jours' : 'Mois'} | Frais: {invoice.repaymentPlan.feePercentage}% ({((invoice.amount * invoice.repaymentPlan.feePercentage) / 100).toFixed(2)} MRU)</p>
                                </div>
                               
                               <div style={{ display: 'flex', gap: '10px' }}>
                                   {invoice.repaymentPlan.feeProofUrl && (
                                       <a href={`${invoice.repaymentPlan.feeProofUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ padding: '8px 15px', fontSize: '0.85rem' }}>
                                          <Download size={16} /> Preuve
                                       </a>
                                   )}
                                   <button onClick={() => handleReviewFee(invoice.repaymentPlan.id, 'REJECTED')} disabled={actionLoading} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '8px 15px' }}>
                                       Refuser
                                   </button>
                                   <button onClick={() => handleReviewFee(invoice.repaymentPlan.id, 'APPROVED')} disabled={actionLoading} className="btn btn-primary" style={{ padding: '8px 15px' }}>
                                       Valider les frais
                                   </button>
                               </div>
                           </div>
                       )}

                       {/* Si l'admin a validé les frais, il doit payer le fournisseur */}
                       {invoice.status === 'READY_TO_PAY' && (
                           <div style={{ background: 'rgba(67, 97, 238, 0.05)', padding: '15px', borderRadius: 'var(--border-radius-sm)', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <div>
                                <p style={{ margin: 0, fontWeight: 500, color: 'var(--primary)' }}>{t('repayment.pay_modal_title', 'Frais validés. Facture prête.')}</p>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Veuillez joindre la preuve de transfert au fournisseur :</p>
                               </div>
                               <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <input 
                                    type="file" 
                                    accept=".jpg,.jpeg,.png,.pdf" 
                                    className="form-input" 
                                    style={{ width: '200px', fontSize: '0.85rem', padding: '6px' }}
                                    onChange={(e) => setUploadFile(e.target.files[0])}
                                  />
                                  <button onClick={() => handlePayInvoice(invoice.id)} disabled={actionLoading} className="btn btn-primary">
                                      <CreditCard size={18} /> Transférer & Valider
                                  </button>
                               </div>
                           </div>
                       )}

                       {/* Confirmation post paiement admin */}
                       {['PAID', 'PLANNED', 'FULLY_REPAID'].includes(invoice.status) && (
                           <div style={{ width: '100%', textAlign: 'right', color: 'var(--success)', fontWeight: 500 }}>
                               <Check size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                               Plan de financement actif.
                           </div>
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

export default AdminInvoices;
