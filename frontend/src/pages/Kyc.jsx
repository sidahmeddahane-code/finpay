import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Upload, UserCheck, AlertCircle } from 'lucide-react';

const Kyc = () => {
  const [formData, setFormData] = useState({ idNumber: '' });
  const [idPhoto, setIdPhoto] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/kyc/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setKycStatus(data);
      } catch (err) {
        console.error('Erreur chargement KYC:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!idPhoto || !selfie) {
      return setError('Veuillez fournir à la fois votre pièce d\'identité et un selfie.');
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('idNumber', formData.idNumber);
      data.append('idPhoto', idPhoto);
      data.append('selfie', selfie);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      });

      const responseData = await res.json();

      if (!res.ok) throw new Error(responseData.error || 'Erreur lors de la soumission.');

      setKycStatus({ status: 'PENDING' }); // Update local state to show pending screen
      
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>Chargement...</div>;

  if (kycStatus?.status === 'APPROVED') {
    return (
      <div className="surface animate-fade-in" style={{ textAlign: 'center', padding: '50px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <ShieldCheck size={64} style={{ color: 'var(--success)', marginBottom: '20px' }} />
        <h2>Identité Vérifiée</h2>
        <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
          Votre compte est entièrement validé. Vous pouvez désormais soumettre des factures et bénéficier des facilités de paiement.
        </p>
        <button onClick={() => navigate('/submit-invoice')} className="btn btn-primary">Soumettre une facture</button>
      </div>
    );
  }

   if (kycStatus?.status === 'PENDING') {
     return (
       <div className="surface animate-fade-in" style={{ textAlign: 'center', padding: '50px 20px', maxWidth: '600px', margin: '0 auto', borderTop: '4px solid var(--primary)' }}>
         <ShieldCheck size={64} style={{ color: 'var(--primary)', marginBottom: '20px', opacity: 0.5 }} />
         <h2>Vérification en cours</h2>
         <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
           Vos documents sont actuellement en cours d'examen par notre équipe de conformité. Ce processus prend généralement moins de 24h.
         </p>
         <button onClick={() => navigate('/dashboard')} className="btn btn-outline" style={{ marginTop: '20px' }}>Retour à l'accueil</button>
       </div>
     );
  }

  if (kycStatus?.status === 'INFO_REQUIRED') {
      const requestedDocs = kycStatus.requestedDocs ? kycStatus.requestedDocs.split(',') : [];
      const needsWork = requestedDocs.includes('work_cert');
      const needsAddress = requestedDocs.includes('address_proof');
      const needsOther = requestedDocs.includes('other');

      const handleExtraDocsSubmit = async (e) => {
          e.preventDefault();
          setError('');
          setSubmitting(true);

          try {
              const data = new FormData();
              if (needsWork && formData.workCert) data.append('workCert', formData.workCert);
              if (needsAddress && formData.addressProof) data.append('addressProof', formData.addressProof);
              if (needsOther && formData.otherDoc) data.append('otherDoc', formData.otherDoc);

              const token = localStorage.getItem('token');
              const res = await fetch('/api/kyc/upload-extra-docs', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` },
                  body: data
              });

              if (!res.ok) throw new Error('Erreur lors de la soumission.');

              setKycStatus({ status: 'PENDING' });
          } catch (err) {
              setError(err.message);
          } finally {
              setSubmitting(false);
          }
      };

      return (
        <div className="surface animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
             <AlertCircle color="var(--primary)" size={32} />
             <div>
               <h3 style={{ color: 'var(--primary)', marginBottom: '5px' }}>Action Requise : Documents Manquants</h3>
               <p style={{ fontSize: '0.9rem' }}>L'administrateur a besoin de documents supplémentaires pour valider votre compte.</p>
             </div>
           </div>
           {error && <div className="mb-4" style={{ padding: '15px', background: 'rgba(239, 35, 60, 0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)' }}>{error}</div>}
           
           <form onSubmit={handleExtraDocsSubmit}>
               <div className="grid-cols-2 mb-4">
                  {needsWork && (
                     <div className="form-group">
                         <label className="form-label">Attestation de travail</label>
                         <input type="file" onChange={(e) => setFormData({...formData, workCert: e.target.files[0]})} required className="form-input" />
                     </div>
                  )}
                  {needsAddress && (
                     <div className="form-group">
                         <label className="form-label">Preuve d'adresse</label>
                         <input type="file" onChange={(e) => setFormData({...formData, addressProof: e.target.files[0]})} required className="form-input" />
                     </div>
                  )}
                  {needsOther && (
                     <div className="form-group">
                         <label className="form-label">Autre document requis</label>
                         <input type="file" onChange={(e) => setFormData({...formData, otherDoc: e.target.files[0]})} required className="form-input" />
                     </div>
                  )}
               </div>
               <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'right' }}>
                   <button type="submit" className="btn btn-primary" disabled={submitting}>
                     {submitting ? 'Envoi...' : 'Transmettre les documents'}
                   </button>
               </div>
           </form>
        </div>
      );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="mb-2" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
         <UserCheck /> Vérification d'Identité (KYC)
      </h1>
      <p className="mb-4" style={{ color: 'var(--text-muted)', maxWidth: '800px' }}>
        Afin de prévenir la fraude et de sécuriser vos transactions, la loi exige de vérifier l'identité de nos utilisateurs. Vos données sont chiffrées et sécurisées.
      </p>

      {kycStatus?.status === 'REJECTED' && (
         <div className="surface mb-4" style={{ borderLeft: '4px solid var(--danger)', background: 'rgba(239, 35, 60, 0.05)' }}>
           <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
             <AlertCircle color="var(--danger)" size={32} />
             <div>
               <h3 style={{ color: 'var(--danger)', marginBottom: '5px' }}>Documents refusés</h3>
               <p style={{ fontSize: '0.9rem' }}>Vos précédents documents n'ont pas pu être validés. Veuillez soumettre de nouveaux documents lisibles et valides.</p>
             </div>
           </div>
         </div>
      )}

      <div className="surface" style={{ maxWidth: '800px' }}>
        {error && <div className="mb-4" style={{ padding: '15px', background: 'rgba(239, 35, 60, 0.1)', color: 'var(--danger)', borderRadius: 'var(--border-radius-sm)' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
              <label className="form-label">Numéro de pièce d'identité (CNI, Passeport, Séjour)</label>
              <input 
                  type="text" 
                  className="form-input" 
                  value={formData.idNumber} 
                  onChange={(e) => setFormData({ idNumber: e.target.value })} 
                  placeholder="EX: 123456789X" 
                  required 
              />
          </div>

          <div className="grid-cols-2 mb-4">
             <div className="form-group">
                 <label className="form-label">Photo du document d'identité</label>
                 <div 
                   style={{ 
                     border: '2px dashed var(--border-color)', 
                     borderRadius: 'var(--border-radius)', 
                     padding: '30px 20px', 
                     textAlign: 'center',
                     cursor: 'pointer',
                     height: '100%'
                   }}
                   onClick={() => document.getElementById('idUpload').click()}
                 >
                   <Upload size={24} style={{ color: 'var(--primary)', marginBottom: '10px' }} />
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '5px' }}>
                     {idPhoto ? idPhoto.name : "Recto (JPG/PNG)"}
                   </p>
                   <input 
                     id="idUpload" 
                     type="file" 
                     accept=".jpg,.jpeg,.png" 
                     onChange={(e) => setIdPhoto(e.target.files[0])} 
                     style={{ display: 'none' }} 
                   />
                 </div>
             </div>

             <div className="form-group">
                 <label className="form-label">Selfie de vérification</label>
                 <div 
                   style={{ 
                     border: '2px dashed var(--border-color)', 
                     borderRadius: 'var(--border-radius)', 
                     padding: '30px 20px', 
                     textAlign: 'center',
                     cursor: 'pointer',
                     height: '100%'
                   }}
                   onClick={() => document.getElementById('selfieUpload').click()}
                 >
                   <span style={{ fontSize: '24px', display: 'block', marginBottom: '10px' }}>🤳</span>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '5px' }}>
                     {selfie ? selfie.name : "Prenez un selfie clair"}
                   </p>
                   <input 
                     id="selfieUpload" 
                     type="file" 
                     accept=".jpg,.jpeg,.png" 
                     onChange={(e) => setSelfie(e.target.files[0])} 
                     style={{ display: 'none' }} 
                   />
                 </div>
             </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'right' }}>
             <button type="submit" className="btn btn-primary" disabled={submitting}>
               {submitting ? 'Envoi Sécurisé...' : 'Transmettre pour validation'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Kyc;
