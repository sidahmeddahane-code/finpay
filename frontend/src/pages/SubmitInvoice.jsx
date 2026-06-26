import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Calendar, DollarSign, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

const parseOcrText = (text) => {
  const result = {
    amount: '',
    invoiceNumber: '',
    provider: '',
    dueDate: ''
  };

  const lines = text.split('\n');

  const amountRegex = /(?:total|montant|mru|net|paye|facture|somme)\s*[:=]?\s*([\d\s]+[.,]\d{2})/i;
  for (const line of lines) {
    const match = line.match(amountRegex);
    if (match) {
      let val = match[1].replace(/\s+/g, '').replace(',', '.');
      if (!isNaN(parseFloat(val))) {
        result.amount = parseFloat(val).toString();
        break;
      }
    }
  }

  const refKeywords = /(?:n[°o]|ref(?:erence)?|facture|fac)\s*[:=]?\s*([a-z0-9-_/]{4,20})/i;
  for (const line of lines) {
    const match = line.match(refKeywords);
    if (match) {
      result.invoiceNumber = match[1].trim().toUpperCase();
      break;
    }
  }

  const providers = ['somelec', 'snde', 'mauritel', 'chinguitel', 'mattel', 'edf', 'orange', 'sonelec', 'senelec'];
  const textLower = text.toLowerCase();
  for (const p of providers) {
    if (textLower.includes(p)) {
      result.provider = p.toUpperCase();
      break;
    }
  }

  if (!result.provider) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 2 && trimmed.length < 25 && /^[A-Z\s]+$/.test(trimmed)) {
        result.provider = trimmed;
        break;
      }
    }
  }

  const dateRegex = /(\d{2})[/-](\d{2})[/-](\d{4})|(\d{4})[/-](\d{2})[/-](\d{2})/;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      if (match[1]) {
        result.dueDate = `${match[3]}-${match[2]}-${match[1]}`;
      } else if (match[4]) {
        result.dueDate = `${match[4]}-${match[5]}-${match[6]}`;
      }
      break;
    }
  }

  return result;
};

const SubmitInvoice = () => {
  const [formData, setFormData] = useState({
    category: 'electricity',
    provider: '',
    invoiceNumber: '',
    amount: '',
    dueDate: ''
  });
  const [file, setFile] = useState(null);
  const [repaymentOptions, setRepaymentOptions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
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

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setOcrSuccess(false);

      if (selectedFile.type.startsWith('image/')) {
        setOcrLoading(true);
        setError('');
        try {
          await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
          if (!window.Tesseract) throw new Error('Tesseract.js failed to load');

          const result = await window.Tesseract.recognize(selectedFile, 'fra+eng');
          const text = result.data.text;
          const parsed = parseOcrText(text);

          const updatedForm = { ...formData };
          let matchCount = 0;

          if (parsed.amount) {
            updatedForm.amount = parsed.amount;
            matchCount++;
          }
          if (parsed.invoiceNumber) {
            updatedForm.invoiceNumber = parsed.invoiceNumber;
            matchCount++;
          }
          if (parsed.provider) {
            updatedForm.provider = parsed.provider;
            matchCount++;
          }
          if (parsed.dueDate) {
            updatedForm.dueDate = parsed.dueDate;
            matchCount++;
          }

          if (matchCount > 0) {
            setFormData(updatedForm);
            setOcrSuccess(true);
          }
        } catch (err) {
          console.error('OCR Error:', err);
        } finally {
          setOcrLoading(false);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      data.append('invoiceDocument', file);
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

      if (!kycStatus || kycStatus.status !== 'APPROVED') {
        if (kycStatus?.status === 'PENDING') {
          setSuccess("Facture soumise ! Votre dossier KYC est en cours d'examen. Votre demande de financement sera validée après approbation du KYC.");
          setTimeout(() => navigate('/my-invoices'), 4000);
        } else {
          setSuccess("Facture soumise avec succès ! Pour débloquer l'approbation de votre financement, veuillez valider votre identité (KYC).");
          setTimeout(() => navigate('/kyc'), 4000);
        }
      } else {
        setSuccess('Facture sécurisée et soumise avec succès !');
        setTimeout(() => navigate('/my-invoices'), 2000);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>{t('status.pending', 'Chargement...')}</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="mb-2" style={{ color: 'var(--primary)' }}>
        {t('invoices.submit_title', 'Soumettre une facture')}
      </h1>
      <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
        {t('invoices.submit_desc', 'FinPay règle vos factures en avance. Vous nous remboursez en plusieurs fois.')}
      </p>

      <div className="surface" style={{ maxWidth: '800px' }}>
        {error && <div className="mb-4" style={{ padding: '15px', background: 'rgba(239, 35, 60, 0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)' }}>{error}</div>}
        {success && <div className="mb-4" style={{ padding: '15px', background: 'rgba(23, 195, 178, 0.1)', color: 'var(--success)', borderRadius: 'var(--border-radius-sm)' }}>{success}</div>}

        {!kycStatus || kycStatus.status !== 'APPROVED' ? (
          <div className="mb-4" style={{ padding: '15px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--border-radius-sm)', color: '#d97706', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <span>⚠️ <strong>Mode d'accès simplifié :</strong> Vous pouvez soumettre votre facture dès maintenant, mais l'approbation du financement nécessitera la validation de votre KYC.</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Type de charge de votre facture</span>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Le nom de l'entreprise émettrice</span>
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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Référence ou numéro de facture unique</span>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Le montant total à payer figurant sur le document</span>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Dernier jour pour payer sans pénalités</span>
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
                  position: 'relative',
                  transition: 'all var(--transition-fast)'
                }}
                onClick={() => document.getElementById('fileUpload').click()}
              >
                {ocrLoading ? (
                  <div style={{ padding: '10px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 15px auto', width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear' }}></div>
                    <h4 style={{ margin: 0, color: 'var(--primary)' }}>Analyse intelligente de la facture (OCR)...</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Extraction automatique des montants et références...</p>
                  </div>
                ) : (
                  <>
                    <Upload size={32} style={{ color: 'var(--primary)', marginBottom: '10px' }} />
                    <h4 style={{ margin: 0 }}>Cliquez pour télécharger</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                      {file ? `✅ ${file.name}` : "Formats acceptés : PDF ou Photos JPG/PNG (Max 50MB)"}
                    </p>
                  </>
                )}
                <input 
                  id="fileUpload" 
                  type="file" 
                  accept=".jpg,.jpeg,.png,.pdf" 
                  onClick={e => e.stopPropagation()}
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </div>
              {ocrSuccess && (
                <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(46,204,113,0.1)', color: 'var(--success)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>💡 <strong>IA OCR Activée :</strong> Les informations du document ont été analysées et pré-remplies avec succès !</span>
                </div>
              )}
            </div>

            <div className="form-group mt-4 mb-4">
               <label className="form-label">Choisissez un plan de remboursement :</label>
               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
                 Taux fixes appliqués au montant financé.
               </span>
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
               <div style={{ textAlign: i18n.language === 'ar' ? 'left' : 'right', marginTop: '15px' }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting || ocrLoading}>
                    {submitting ? t('status.pending', 'Envoi en cours...') : t('invoices.submit_btn', 'Soumettre pour validation')}
                  </button>
               </div>
            </div>
          </form>
        </div>
      </div>
  );
};

export default SubmitInvoice;
