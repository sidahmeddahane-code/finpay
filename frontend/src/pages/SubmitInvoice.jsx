import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Calendar, DollarSign, Building, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SubmitInvoice = () => {
  const [step, setStep] = useState('form'); // 'form' or 'otp'
  const [formData, setFormData] = useState({
    category: 'electricity',
    provider: '',
    invoiceNumber: '',
    amount: '',
    dueDate: ''
  });
  const [file, setFile] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpMethod, setOtpMethod] = useState('sms'); // 'sms' or 'email'
  const [repaymentOptions, setRepaymentOptions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    // Check KYC status before allowing submission
    const checkKyc = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/kyc/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setKycStatus(data);
      } catch (err) {
        console.error('Erreur vérification KYC:', err);
      } finally {
        setLoading(false);
      }
    };
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/invoices/repayment-options', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setRepaymentOptions(data);
        if(data.length > 0) setSelectedPlan({ duration: data[0].duration, durationType: data[0].durationType });
      } catch (err) {
        console.error('Erreur chargement options:', err);
      }
    };
    
    checkKyc();
    fetchOptions();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Etape 1 : Demander un OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      return setError('Veuillez joindre une copie de la facture.');
    }
    
    if (!selectedPlan) {
      return setError('Veuillez sélectionner un plan de remboursement.');
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
    const res = await fetch('/api/invoices/send-submit-otp', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: otpMethod })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'envoi OTP");

      setSuccess(`Code envoyé par ${otpMethod === 'email' ? 'email' : 'SMS'}.`);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Etape 2 : Confirmer via OTP et Envoyer Facture
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      data.append('invoiceDocument', file);
      data.append('otpCode', otpCode); // Ajout de l'OTP
      data.append('requestedDuration', selectedPlan.duration);
      data.append('requestedDurationType', selectedPlan.durationType);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/invoices/submit', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      const responseData = await res.json();

      if (!res.ok) throw new Error(responseData.error || 'Erreur lors de la soumission.');

      setSuccess('Facture sécurisée et soumise avec succès !');
      setTimeout(() => navigate('/my-invoices'), 2000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>{t('status.pending', 'Chargement...')}</div>;

  if (!kycStatus || kycStatus.status !== 'APPROVED') {
    return (
      <div className="surface animate-fade-in" style={{ textAlign: 'center', padding: '50px 20px' }}>
        <FileText size={64} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '20px' }} />
        <h2 style={{ marginBottom: '15px' }}>Action requise</h2>
        <p className="mb-4" style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 30px' }}>
          Pour des raisons de sécurité, nous devons vérifier votre identité avant que vous ne puissiez soumettre des factures pour un financement.
        </p>
        
        {kycStatus?.status === 'PENDING' ? (
            <div className="badge badge-pending mb-4" style={{ fontSize: '1rem', padding: '10px 20px' }}>Votre vérification est en cours de traitement</div>
        ) : (
            <button onClick={() => navigate('/kyc')} className="btn btn-primary">Passer la vérification KYC</button>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="mb-2" style={{ color: 'var(--primary)' }}>
        {step === 'form' ? t('invoices.submit_title', 'Soumettre une facture') : 'Verification de Sécurité SMS'}
      </h1>
      <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
        {step === 'form' 
           ? t('invoices.submit_desc', 'FinPay règle vos factures en avance. Vous nous remboursez en plusieurs fois.') 
           : 'Entrez le code OTP reçu par SMS pour "signer" et soumettre officiellement cette facture.'}
      </p>

      <div className="surface" style={{ maxWidth: '800px' }}>
        {error && <div className="mb-4" style={{ padding: '15px', background: 'rgba(239, 35, 60, 0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)' }}>{error}</div>}
        {success && <div className="mb-4" style={{ padding: '15px', background: 'rgba(23, 195, 178, 0.1)', color: 'var(--success)', borderRadius: 'var(--border-radius-sm)' }}>{success}</div>}

        {step === 'form' ? (
          <form onSubmit={handleRequestOtp}>
            <div className="grid-cols-2 mb-2">
              <div className="form-group">
                <label className="form-label">{t('invoices.category', 'Catégorie')}</label>
                <select 
                  name="category" 
                  className="form-input" 
                  value={formData.category} 
                  onChange={handleChange}
                >
                  <option value="electricity">Électricité</option>
                  <option value="water">Eau</option>
                  <option value="internet">Internet / Téléphone</option>
                  <option value="penalty">Amende / Pénalité</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div className="form-group relative">
                <label className="form-label">{t('invoices.provider', 'Fournisseur')}</label>
                <div style={{ position: 'relative' }}>
                  <Building size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    name="provider" 
                    className="form-input" 
                    style={{ [i18n.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '45px' }}
                    value={formData.provider} 
                    onChange={handleChange} 
                    placeholder="Ex: EDF, Orange..." 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="form-group relative">
              <label className="form-label">{t('invoices.ref_number', 'Numéro de la facture / Référence')}</label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  name="invoiceNumber" 
                  className="form-input"
                  style={{ [i18n.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '45px' }}
                  value={formData.invoiceNumber} 
                  onChange={handleChange} 
                  placeholder="Ex: FAC-2023-0892" 
                  required 
                />
              </div>
            </div>

            <div className="grid-cols-2 mb-2">
              <div className="form-group relative">
                <label className="form-label">{t('invoices.amount', 'Montant Total')} (MRU)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
                  <input 
                    type="number" 
                    name="amount" 
                    step="0.01" 
                    className="form-input" 
                    style={{ [i18n.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '45px' }}
                    value={formData.amount} 
                    onChange={handleChange} 
                    placeholder="0.00" 
                    required 
                  />
                </div>
              </div>

              <div className="form-group relative">
                <label className="form-label">{t('invoices.due_date', "Date d'échéance fournisseur")}</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', top: '15px', [i18n.language === 'ar' ? 'right' : 'left']: '15px', color: 'var(--text-muted)' }} />
                  <input 
                    type="date" 
                    name="dueDate" 
                    className="form-input" 
                    style={{ [i18n.language === 'ar' ? 'paddingRight' : 'paddingLeft']: '45px' }}
                    value={formData.dueDate} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="form-group mt-4 mb-4">
              <label className="form-label">{t('invoices.document', 'Document justificatif (Photo ou PDF)')}</label>
              <div 
                style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: 'var(--border-radius)', 
                  padding: '40px', 
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
                onClick={() => document.getElementById('fileUpload').click()}
              >
                <Upload size={32} style={{ color: 'var(--primary)', marginBottom: '10px' }} />
                <h4 style={{ margin: 0 }}>Cliquez pour télécharger</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                  {file ? `✅ ${file.name}` : "Formats acceptés : PDF ou Photos JPG/PNG (Max 50MB)"}
                </p>
                <input 
                  id="fileUpload" 
                  type="file" 
                  accept=".jpg,.jpeg,.png,.pdf" 
                  onClick={e => e.stopPropagation()}
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </div>
            </div>

            <div className="form-group mt-4 mb-4">
               <label className="form-label">Choisissez un plan de remboursement :</label>
               <div className="grid-cols-3 mb-3">
                   {repaymentOptions.length === 0 ? (
                       <p style={{ color: 'var(--text-muted)' }}>Aucun plan disponible actuellement.</p>
                   ) : repaymentOptions.map(p => (
                       <div 
                         key={p.id}
                         onClick={() => setSelectedPlan({ duration: p.duration, durationType: p.durationType })}
                         className={`surface ${selectedPlan?.duration === p.duration && selectedPlan?.durationType === p.durationType ? 'active-plan' : ''}`} 
                         style={{ 
                             cursor: 'pointer', padding: '15px', textAlign: 'center', 
                             border: selectedPlan?.duration === p.duration && selectedPlan?.durationType === p.durationType ? '2px solid var(--primary)' : '1px solid var(--border-color)' 
                         }}>
                           <h3 style={{ margin: '0 0 5px 0' }}>{p.duration} {p.durationType === 'DAYS' ? 'Jours' : 'Mois'}</h3>
                           <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Frais: {p.feePercentage}%</p>
                           {formData.amount && !isNaN(formData.amount) && (
                               <div>
                                   <p style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '2px' }}>
                                       {((parseFloat(formData.amount) * (p.feePercentage / 100)) + 50).toFixed(2)} MRU
                                   </p>
                                   <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>(à payer après validation)</p>
                               </div>
                           )}
                       </div>
                   ))}
               </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
               {/* OTP Method Selector */}
               <div className="form-group">
                 <label className="form-label">Recevoir le code de confirmation par :</label>
                 <div style={{ display: 'flex', background: 'var(--surface-hover)', borderRadius: 'var(--border-radius-sm)', padding: '4px', gap: '4px' }}>
                   <button type="button" onClick={() => setOtpMethod('sms')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontWeight: 600, background: otpMethod === 'sms' ? 'var(--primary)' : 'transparent', color: otpMethod === 'sms' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                     📱 SMS
                   </button>
                   <button type="button" onClick={() => setOtpMethod('email')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--border-radius-sm)', cursor: 'pointer', fontWeight: 600, background: otpMethod === 'email' ? 'var(--primary)' : 'transparent', color: otpMethod === 'email' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s' }}>
                     📧 Email
                   </button>
                 </div>
               </div>
               <div style={{ textAlign: i18n.language === 'ar' ? 'left' : 'right', marginTop: '15px' }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Préparation...' : t('invoices.submit_btn', 'Soumettre pour validation')}
                  </button>
               </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleFinalSubmit} style={{ textAlign: 'center' }}>
            <div className="form-group relative" style={{ maxWidth: '300px', margin: '0 auto' }}>
              <label className="form-label" style={{ textAlign: 'left' }}>Code de confirmation (6 chiffres)</label>
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
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button type="button" onClick={() => {setStep('form'); setError(''); setSuccess('');}} className="btn surface text-muted" style={{ padding: '10px 20px' }}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Validation...' : 'Confirmer la soumission'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SubmitInvoice;
