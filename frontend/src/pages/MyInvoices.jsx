import { useState, useEffect } from 'react';
import { Download, CreditCard, Clock, CheckCircle, ChevronDown, ChevronUp, Upload, X, FileText, FileSignature, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import EngagementDocument from '../components/EngagementDocument';

const MyInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // States pour la modale de paiement
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [paymentData, setPaymentData] = useState({ method: '', file: null });
  const [repaymentOptions, setRepaymentOptions] = useState([]);

  // States pour la soumission d'un plan (V4)
  const [planForm, setPlanForm] = useState({ duration: 2, durationType: 'MONTHS', method: '', file: null, signed: false });
  const [receiptInvoice, setReceiptInvoice] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);
  const [additionalDocUpload, setAdditionalDocUpload] = useState(null);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setUserProfile(data);
  };

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/invoices/my-invoices', {
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

  const fetchPaymentMethods = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/invoices/payment-methods', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPaymentMethods(data);
      if(data.length > 0) {
          setPaymentData(prev => ({ ...prev, method: data[0].name }));
          setPlanForm(prev => ({ ...prev, method: data[0].name }));
      }
    } catch (err) {
      console.error('Erreur chargement méthodes:', err);
    }
  }

  const fetchRepaymentOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/invoices/repayment-options', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRepaymentOptions(data);
      if(data.length > 0) {
          setPlanForm(prev => ({ ...prev, duration: data[0].duration, durationType: data[0].durationType }));
      }
    } catch (err) {
      console.error('Erreur chargement options:', err);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchPaymentMethods();
    fetchRepaymentOptions();
    fetchProfile();
  }, []);

  const handleAcceptPlan = async (e, invoice) => {
    e.preventDefault();
    if (!planForm.file) {
        return alert("Veuillez joindre la preuve de paiement des frais.");
    }
    if (!planForm.signed) {
        return alert("Veuillez signer l'engagement de remboursement.");
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      
      let option = repaymentOptions.find(opt => opt.duration === invoice.requestedDuration && opt.durationType === invoice.requestedDurationType);
      if (!option && repaymentOptions.length > 0) option = repaymentOptions[0];
      
      formData.append('duration', option ? option.duration : planForm.duration);
      formData.append('durationType', option ? option.durationType : planForm.durationType);
      formData.append('method', planForm.method);
      formData.append('feeProof', planForm.file);
      formData.append('commitmentSigned', planForm.signed);

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/${invoice.id}/accept-plan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if(!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur serveur");
      }
      
      alert(t('repayment.granted', "Plan soumis avec succès. En attente de validation des frais."));
      setPlanForm({ duration: 2, method: paymentMethods.length > 0 ? paymentMethods[0].name : '', file: null, signed: false });
      await fetchInvoices(); // Refresh data
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const submitAdditionalDoc = async (e, invoiceId) => {
    e.preventDefault();
    if (!additionalDocUpload) return alert('Veuillez joindre le document demandé.');
    
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('additionalDocument', additionalDocUpload);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/${invoiceId}/submit-additional-doc`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error("Erreur d'envoi du document");
      alert('Document soumis avec succès !');
      setAdditionalDocUpload(null);
      fetchInvoices();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!paymentData.file) {
        return alert("Veuillez joindre une preuve (reçu ou capture d'écran).");
    }

    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('method', paymentData.method);
      formData.append('paymentProof', paymentData.file);

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/pay-installment/${selectedInstallment.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if(!res.ok) throw new Error("Erreur serveur");

      await fetchInvoices(); // Refresh data
      setSelectedInstallment(null);
      setPaymentData({ method: paymentMethods.length > 0 ? paymentMethods[0].name : '', file: null });
      alert("Preuve soumise avec succès ! En attente de vérification par FinPay.");
    } catch (error) {
       console.error(error);
       alert("Erreur lors de la soumission du paiement.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span className="badge badge-pending">En cours d'examen</span>;
      case 'APPROVED': return <span className="badge badge-success">{t('status.approved', 'Approuvée')}</span>; // Phase 1: Facture validée par admin
      case 'FEE_VERIFYING': return <span className="badge badge-warning">Vérification Frais</span>; // Admin vérifie la preuve de paiement des frais
      case 'READY_TO_PAY': return <span className="badge badge-success">Prêt à Payer</span>; // Frais validés, attente paiement fournisseur
      case 'INFO_REQUIRED': return <span className="badge badge-warning" style={{ background: '#f59e0b11', color: '#f59e0b' }}>Infos Requises</span>;
      case 'PAID': return <span className="badge badge-primary">Plan en cours</span>; // Admin a payé, plan actif
      case 'PLANNED': return <span className="badge badge-primary">Plan en cours</span>; 
      case 'FULLY_REPAID': return <span className="badge badge-success">Remboursée</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>{t('status.pending', 'Chargement...')}</div>;

  return (
    <div className="animate-fade-in relative">
      <style>{`
          @media print {
              body * { visibility: hidden; }
              #receipt-content, #receipt-content * { visibility: visible; }
              #receipt-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
              .print-hide { display: none !important; }
          }
      `}</style>
      <h1 className="mb-2" style={{ color: 'var(--primary)' }}>{t('invoices.my_invoices', 'Mes Demandes')}</h1>
      <p className="mb-4" style={{ color: 'var(--text-muted)' }}>{t('invoices.submit_desc', 'Consultez et gérez vos factures et échéanciers actifs.')}</p>

      {/* Modal Reçu PDF */}
      {receiptInvoice && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }} className="print-hide-bg">
             <div className="surface animate-fade-in" style={{ width: '100%', maxWidth: '700px', background: 'white', position: 'relative', marginTop: '20px', marginBottom: '40px', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                 <button onClick={() => setReceiptInvoice(null)} style={{ background: 'none', border: 'none', position: 'absolute', top: '20px', right: '20px', cursor: 'pointer' }} className="print-hide">
                     <X size={24} color="var(--text-muted)" />
                 </button>
                 
                 <div id="receipt-content">
                     <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid var(--border-color)', paddingBottom: '20px' }}>
                         <h1 style={{ color: 'var(--primary)', margin: '0 0 10px 0', fontSize: '2rem' }}>FinPay</h1>
                         <h2 style={{ margin: 0, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '2px' }}>Reçu d'Engagement</h2>
                         <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Date d'émission : {new Date().toLocaleDateString()}</p>
                     </div>

                     <div className="grid-cols-2 mb-4">
                         <div>
                             <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '8px' }}>Informations Facture</h4>
                             <p style={{ margin: '4px 0' }}><strong>Prestataire :</strong> <span style={{ textTransform: 'capitalize' }}>{receiptInvoice.provider}</span></p>
                             <p style={{ margin: '4px 0' }}><strong>Référence :</strong> {receiptInvoice.invoiceNumber}</p>
                             <p style={{ margin: '4px 0' }}><strong>Montant Original :</strong> {receiptInvoice.amount.toFixed(2)} MRU</p>
                         </div>
                         <div style={{ textAlign: 'right' }}>
                             <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '8px' }}>Frais Payés d'Avance</h4>
                             <p style={{ margin: '4px 0' }}><strong>Frais de Service ({receiptInvoice.repaymentPlan.feePercentage}%) :</strong> {(receiptInvoice.amount * (receiptInvoice.repaymentPlan.feePercentage / 100)).toFixed(2)} MRU</p>
                             <p style={{ margin: '4px 0' }}><strong>Frais de Transaction :</strong> 50.00 MRU</p>
                             <p style={{ color: 'var(--success)', fontWeight: 'bold', margin: '4px 0', fontSize: '1.1rem' }}>Total Déjà Payé : {((receiptInvoice.amount * (receiptInvoice.repaymentPlan.feePercentage / 100)) + 50).toFixed(2)} MRU</p>
                         </div>
                     </div>

                     <h3 className="mb-3 mt-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Tableau d'Amortissement</h3>
                     <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                         <thead>
                             <tr style={{ background: 'rgba(67, 97, 238, 0.05)', textAlign: 'left' }}>
                                 <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Échéance</th>
                                 <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)' }}>Date Limite</th>
                                 <th style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', textAlign: 'right' }}>Montant (MRU)</th>
                             </tr>
                         </thead>
                         <tbody>
                             {receiptInvoice.repaymentPlan.installments.map((inst, idx) => (
                                 <tr key={inst.id}>
                                     <td style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>Échéance {idx + 1}</td>
                                     <td style={{ padding: '12px', borderBottom: '1px solid var(--border-color)' }}>{new Date(inst.dueDate).toLocaleDateString()}</td>
                                     <td style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 'bold' }}>{inst.amount.toFixed(2)}</td>
                                 </tr>
                             ))}
                         </tbody>
                         <tfoot>
                             <tr>
                                 <td colSpan="2" style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem' }}>Total à Rembourser :</td>
                                 <td style={{ padding: '15px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>
                                     {receiptInvoice.amount.toFixed(2)} MRU
                                 </td>
                             </tr>
                         </tfoot>
                     </table>
                     
                     <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                         <p>Le financement de cette facture a été validé. En cas de non-paiement aux dates limites, des pénalités de retard pourront être appliquées.</p>
                         <p>Merci de votre confiance.</p>
                     </div>
                 </div>

                 <div className="flex-center mt-4 print-hide">
                     <button onClick={() => window.print()} className="btn btn-primary" style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 24px', width: '100%', justifyContent: 'center' }}>
                         <Download size={20} /> Imprimer / Sauvegarder PDF
                     </button>
                 </div>
             </div>
          </div>
      )}

      {/* Modal de Paiement */}
      {selectedInstallment && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <div className="surface animate-fade-in" style={{ width: '90%', maxWidth: '500px', position: 'relative' }}>
                 <button 
                  onClick={() => setSelectedInstallment(null)} 
                  style={{ background: 'none', border: 'none', position: 'absolute', top: '20px', right: '20px', cursor: 'pointer' }}
                 >
                     <X size={24} color="var(--text-muted)" />
                 </button>
                 
                 <h2 className="mb-2">{t('repayment.pay_modal_title', "Rembourser l'échéance")}</h2>
                 <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
                    {t('repayment.pay_modal_desc', "Veuillez transférer le montant sur l'un de nos comptes et uploader le reçu.")} 
                    <br/><strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{(selectedInstallment.amount + (selectedInstallment.dynamicPenalty || 0)).toFixed(2)} MRU</strong>
                    {selectedInstallment.dynamicPenalty > 0 && (
                        <span style={{ display: 'block', color: 'var(--danger)', fontSize: '0.85rem', marginTop: '5px' }}>
                            (Inclut {selectedInstallment.dynamicPenalty.toFixed(2)} MRU de pénalité de retard)
                        </span>
                    )}
                 </p>

                 <form onSubmit={handlePaySubmit}>
                     
                     <div className="form-group mb-3">
                         <label className="form-label">{t('repayment.account', "Comptes d'encaissement FinPay")}</label>
                         <select 
                            className="form-input" 
                            style={{ background: 'rgba(67, 97, 238, 0.05)', borderColor: 'var(--primary-light)' }}
                            value={paymentData.method}
                            onChange={(e) => setPaymentData({...paymentData, method: e.target.value})}
                         >
                             {paymentMethods.map(m => (
                                 <option key={m.id} value={m.name}>{m.provider} - {m.name} ({m.accountNumber})</option>
                             ))}
                         </select>
                     </div>

                     <div className="form-group mb-4">
                        <label className="form-label">{t('repayment.proof', "Preuve de transfert")}</label>
                        <div 
                        style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius)', padding: '20px', textAlign: 'center', cursor: 'pointer' }}
                        onClick={() => document.getElementById('proofUpload').click()}
                        >
                        <Upload size={24} style={{ color: 'var(--primary)', marginBottom: '10px' }} />
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '5px' }}>
                            {paymentData.file ? paymentData.file.name : "Cliquez pour uploader (JPG/PNG)"}
                        </p>
                        <input 
                            id="proofUpload" type="file" accept=".jpg,.jpeg,.png,.pdf" 
                            onClick={e => e.stopPropagation()}
                            onChange={(e) => setPaymentData({...paymentData, file: e.target.files[0]})} 
                            style={{ display: 'none' }} 
                        />
                        </div>
                     </div>

                     <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ width: '100%' }}>
                        {actionLoading ? '...' : t('repayment.send_proof', "Transmettre la preuve")}
                     </button>
                 </form>
             </div>
          </div>
      )}

      {invoices.length === 0 ? (
        <div className="surface flex-center" style={{ minHeight: '30vh', flexDirection: 'column', color: 'var(--text-muted)' }}>
          <Clock size={48} style={{ opacity: 0.3, marginBottom: '20px' }} />
          <p>{t('invoices.no_data', 'Aucune facture soumise pour le moment.')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {invoices.map(invoice => (
            <div key={invoice.id} className="surface" style={{ padding: 0, overflow: 'hidden' }}>
              <div 
                style={{ padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onClick={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)}
              >
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ 
                        width: '50px', height: '50px', borderRadius: '50%', 
                        background: 'rgba(67, 97, 238, 0.1)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' 
                    }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', textTransform: 'capitalize' }}>{invoice.provider}</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Réf: {invoice.invoiceNumber}</p>
                    </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>{invoice.amount.toFixed(2)} MRU</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Le {new Date(invoice.submittedAt).toLocaleDateString()}</p>
                    </div>
                    <div style={{ width: '130px', textAlign: 'center' }}>{getStatusBadge(invoice.status)}</div>
                    {expandedId === invoice.id ? <ChevronUp color="var(--text-muted)"/> : <ChevronDown color="var(--text-muted)"/>}
                </div>
              </div>

              {expandedId === invoice.id && (
                <div style={{ borderTop: '1px solid var(--border-color)', padding: '20px', background: 'var(--surface-hover)' }}>
                  <div className="grid-cols-2">
                    <div>
                      <h4 className="mb-2">{t('invoices.details', 'Détails de la demande')}</h4>
                      <p><strong>{t('invoices.category', 'Catégorie')}:</strong> {invoice.category}</p>
                      <p><strong>{t('invoices.due_date', 'Date limite')}:</strong> {new Date(invoice.dueDate).toLocaleDateString()}</p>
                      <a href={`${invoice.documentUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-2" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                         <Download size={16} /> {t('invoices.see_doc', 'Voir la facture')}
                      </a>

                      {invoice.adminPaymentProofUrl && (
                        <div className="mt-4" style={{ padding: '15px', background: 'rgba(67, 97, 238, 0.05)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--primary-light)' }}>
                            <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>Paiement FinPay au fournisseur :</p>
                            <a href={`${invoice.adminPaymentProofUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', padding: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                <Download size={16} /> Télécharger le reçu
                            </a>
                        </div>
                      )}
                    </div>

                    <div>
                      {/* INFO_REQUIRED section */}
                      {invoice.status === 'INFO_REQUIRED' && (
                          <div className="mt-4" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.3)', padding: '20px', borderRadius: 'var(--border-radius)', textAlign: 'left' }}>
                              <h4 style={{ color: '#f59e0b', marginBottom: '10px' }}>⚠️ Action Requise : Documents Manquants</h4>
                              <p style={{ fontSize: '0.9rem', marginBottom: '15px', color: 'var(--text-main)' }}>
                                L'administrateur a besoin d'informations supplémentaires pour traiter votre demande.<br/>
                                <strong>Documents demandés :</strong> {invoice.requestedDocs}
                              </p>
                              <form onSubmit={(e) => submitAdditionalDoc(e, invoice.id)} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                  <div style={{ flex: 1 }}>
                                      <input 
                                          type="file" 
                                          className="form-input" 
                                          accept=".jpg,.jpeg,.png,.pdf" 
                                          onChange={(e) => setAdditionalDocUpload(e.target.files[0])}
                                      />
                                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px' }}>Requis: {invoice.requestedDocs}</p>
                                  </div>
                                  <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
                                      {actionLoading ? '...' : 'Envoyer Document'}
                                  </button>
                              </form>
                          </div>
                      )}

                      {/* GATE: Phone verification required before accessing payment plan */}
                      {invoice.status === 'APPROVED' && !invoice.repaymentPlan && userProfile && !userProfile.isPhoneVerified && (
                        <div style={{ background: 'rgba(248,150,30,0.08)', border: '2px solid rgba(248,150,30,0.4)', borderRadius: 'var(--border-radius)', padding: '25px', textAlign: 'center' }}>
                          <Phone size={40} style={{ color: '#f8961e', marginBottom: '15px' }} />
                          <h4 style={{ color: '#f8961e', marginBottom: '10px' }}>Vérification de téléphone requise</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                            Votre facture a été approuvée ! Pour accéder aux détails du plan de paiement et procéder au règlement des frais, vous devez d'abord vérifier votre numéro de téléphone.
                          </p>
                          <button onClick={() => navigate('/profile')} className="btn btn-primary">
                            📲 Vérifier mon téléphone
                          </button>
                        </div>
                      )}

                      {/* Cas 1: L'admin a approuvé la facture, l'utilisateur doit payer les frais du plan choisi lors de la soumission */}
                      {invoice.status === 'APPROVED' && !invoice.repaymentPlan && userProfile?.isPhoneVerified && (
                        <div style={{ background: 'var(--surface-light)', padding: '20px', borderRadius: 'var(--border-radius)', border: '1px solid var(--primary-light)' }}>
                          <h4 style={{ color: 'var(--primary)', marginBottom: '10px' }}>{t('repayment.granted', 'Financement pré-approuvé !')}</h4>
                          <p style={{ fontSize: '0.9rem', marginBottom: '15px' }}>Votre facture est approuvée. Voici le plan que vous avez sélectionné. Payez les frais initiaux pour débloquer le financement :</p>
                          
                          <form onSubmit={(e) => handleAcceptPlan(e, invoice)}>
                              {/* Affichage de la durée choisie */}
                              <div className="mb-3">
                                  {(() => {
                                      let option = repaymentOptions.find(opt => opt.duration === invoice.requestedDuration && opt.durationType === invoice.requestedDurationType);
                                      if (!option && repaymentOptions.length > 0) option = repaymentOptions[0];
                                      
                                      return option ? (
                                        <div 
                                          className="surface active-plan" 
                                          style={{ 
                                              padding: '15px', textAlign: 'center', 
                                              border: '2px solid var(--primary)',
                                              borderRadius: 'var(--border-radius-sm)'
                                          }}>
                                            <h3 style={{ margin: '0 0 5px 0' }}>Plan de {option.duration} {option.durationType === 'DAYS' ? 'Jours' : 'Mois'}</h3>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Frais: {option.feePercentage}%</p>
                                            <p style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '2px' }}>
                                                {((invoice.amount * (option.feePercentage / 100)) + 50).toFixed(2)} MRU
                                            </p>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>(Frais de service + 50 MRU transaction)</p>
                                        </div>
                                      ) : (
                                          <p style={{ color: 'var(--danger)' }}>Plan sélectionné introuvable.</p>
                                      );
                                  })()}
                              </div>

                              <div className="mb-3">
                                  <label className="form-label">Compte d'envoi des frais</label>
                                  <select 
                                        className="form-input" 
                                        value={planForm.method}
                                        onChange={(e) => setPlanForm({...planForm, method: e.target.value})}
                                  >
                                        {paymentMethods.map(m => (
                                            <option key={m.id} value={m.name}>{m.provider} - {m.name} ({m.accountNumber})</option>
                                        ))}
                                  </select>
                              </div>

                              <div className="mb-3">
                                  <label className="form-label">
                                      Preuve du paiement des frais calculés ci-dessus ({
                                        (() => {
                                          let option = repaymentOptions.find(opt => opt.duration === invoice.requestedDuration && opt.durationType === invoice.requestedDurationType);
                                          if (!option && repaymentOptions.length > 0) option = repaymentOptions[0];
                                          const feePercent = option ? option.feePercentage : 0;
                                          return ((invoice.amount * (feePercent / 100)) + 50).toFixed(2);
                                        })()
                                      } MRU)
                                  </label>
                                  <input 
                                    type="file" 
                                    className="form-input" 
                                    accept=".jpg,.jpeg,.png,.pdf" 
                                    onClick={e => e.stopPropagation()}
                                    onChange={(e) => setPlanForm({...planForm, file: e.target.files[0]})}
                                  />
                              </div>

                              <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <input 
                                    type="checkbox" 
                                    id={`commit-${invoice.id}`}
                                    checked={planForm.signed}
                                    onChange={(e) => setPlanForm({...planForm, signed: e.target.checked})}
                                    style={{ width: '20px', height: '20px' }}
                                  />
                                  <label htmlFor={`commit-${invoice.id}`} style={{ fontSize: '0.9rem' }}>
                                      Je m'engage à rembourser l'intégralité des échéances mensuelles pour cette facture selon le plan choisi. En cas de non respect, je m'expose à des pénalités.
                                  </label>
                              </div>

                              <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ width: '100%' }}>
                                  {actionLoading ? 'Envoi...' : 'Payer les frais et activer le plan'}
                              </button>
                          </form>
                        </div>
                      )}

                      {/* Cas: Validation des frais ou paiement admin en cours */}
                      {['FEE_VERIFYING', 'READY_TO_PAY'].includes(invoice.status) && (
                         <div style={{ padding: '20px', textAlign: 'center', background: 'var(--surface-light)', borderRadius: 'var(--border-radius)', border: '1px dashed var(--primary-light)' }}>
                            <Clock size={32} style={{ color: 'var(--primary)', margin: '0 auto 10px' }} />
                            <h4 style={{ color: 'var(--primary)', marginBottom: '10px' }}>{invoice.status === 'FEE_VERIFYING' ? 'Vérification de vos frais en cours' : 'FinPay finalise votre facture'}</h4>
                            <p style={{ color: 'var(--text-muted)' }}>
                                {invoice.status === 'FEE_VERIFYING' 
                                  ? 'Un agent vérifie votre reçu de frais. Dès validation, votre facture sera payée au prestataire.' 
                                  : 'Les frais ont été validés. FinPay est en train de payer votre fournisseur. L\'échéancier s\'activera tout de suite après.'}
                            </p>
                         </div>
                      )}

                      {/* Cas 2: Un plan est actif, afficher l'échéancier */}
                      {(['PLANNED', 'PAID', 'FULLY_REPAID'].includes(invoice.status)) && invoice.repaymentPlan && invoice.repaymentPlan.status !== 'FEE_VERIFYING' && (
                        <div>
                          <div className="flex-between mb-2">
                             <h4 style={{ margin: 0 }}>{t('repayment.your_plan', 'Votre échéancier')}</h4>
                             <div style={{ display: 'flex', gap: '10px' }}>
                                 {invoice.repaymentPlan.commitmentSigned && (
                                     <button onClick={() => setViewingContract(invoice)} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
                                         <FileSignature size={14} style={{ marginRight: '5px' }} /> Voir le Contrat
                                     </button>
                                 )}
                                 <button onClick={() => setReceiptInvoice(invoice)} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '6px 12px', color: 'var(--primary)', borderColor: 'var(--primary)' }}>Voir le Reçu (PDF)</button>
                             </div>
                          </div>
                          <div style={{ background: 'var(--surface-light)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                             {invoice.repaymentPlan.installments.map((inst, index) => (
                               <div key={inst.id} style={{ padding: '15px', borderBottom: index < invoice.repaymentPlan.installments.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <p style={{ fontWeight: 600 }}>{t('repayment.installment', 'Échéance')} {index + 1}/{invoice.repaymentPlan.installments.length}</p>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('repayment.due_for', 'Pour le')} {new Date(inst.dueDate).toLocaleDateString()}</p>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontWeight: 600, display: 'block' }}>{inst.amount.toFixed(2)} MRU</span>
                                        {inst.dynamicPenalty > 0 && (
                                            <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>+ {inst.dynamicPenalty.toFixed(2)} MRU (Pénalité)</span>
                                        )}
                                    </div>
                                    {inst.status === 'PAID' ? (
                                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle size={16}/> {t('repayment.paid', 'Payé')}</span>
                                    ) : inst.status === 'VERIFYING' ? (
                                      <span className="badge badge-pending">{t('repayment.verifying', 'En vérification')}</span>
                                    ) : (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedInstallment(inst); }}
                                        disabled={actionLoading}
                                        className="btn btn-primary" 
                                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                                      >
                                        <CreditCard size={16} /> {t('repayment.pay', 'Payer')}
                                      </button>
                                    )}
                                  </div>
                               </div>
                             ))}
                          </div>
                        </div>
                      )}

                      {/* Cas 3: En attente */}
                      {invoice.status === 'PENDING' && (
                         <div style={{ padding: '20px', textAlign: 'center', background: 'var(--surface-light)', borderRadius: 'var(--border-radius)', border: '1px dashed var(--border-color)' }}>
                            <Clock size={32} style={{ color: 'var(--warning)', margin: '0 auto 10px' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Votre demande est en cours d'analyse. Nous vous informerons dès sa validation par un de nos agents.</p>
                         </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Document Viewer */}
      {viewingContract && (
          <EngagementDocument 
              user={viewingContract.user} 
              invoice={viewingContract} 
              onClose={() => setViewingContract(null)} 
          />
      )}
    </div>
  );
};

export default MyInvoices;
