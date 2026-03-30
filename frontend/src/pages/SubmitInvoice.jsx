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
    checkKyc();
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

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/invoices/send-submit-otp', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'envoi OTP");

      setSuccess('Un code SMS vous a été envoyé pour confirmer cette facture.');
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
                  {file ? file.name : "Formats acceptés : JPG, PNG, PDF (Max 5MB)"}
                </p>
                <input 
                  id="fileUpload" 
                  type="file" 
                  accept=".jpg,.jpeg,.png,.pdf" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: i18n.language === 'ar' ? 'left' : 'right' }}>
               <button type="submit" className="btn btn-primary" disabled={submitting}>
                 {submitting ? 'Préparation...' : t('invoices.submit_btn', 'Soumettre pour validation')}
               </button>
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
