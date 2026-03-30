import { useState, useEffect } from 'react';
import { ZoomIn, Check, X } from 'lucide-react';
import UserHistoryModal from '../components/UserHistoryModal';
import { useTranslation } from 'react-i18next';

const AdminKyc = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Modal for images
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [requestModalUser, setRequestModalUser] = useState(null);
  const [docsReq, setDocsReq] = useState({ workCert: false, addressProof: false, other: false });
  const { t } = useTranslation();

  const handleRequestDocs = async () => {
      setActionLoading(true);
      try {
          const reqArray = [];
          if (docsReq.workCert) reqArray.push('work_cert');
          if (docsReq.addressProof) reqArray.push('address_proof');
          if (docsReq.other) reqArray.push('other');

          const requestedDocsStr = reqArray.join(',');

          const token = localStorage.getItem('token');
          await fetch(`/api/admin/kyc/${requestModalUser}/request-docs`, {
              method: 'POST',
              headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ requestedDocs: requestedDocsStr })
          });
          setRequestModalUser(null);
          setDocsReq({ workCert: false, addressProof: false, other: false });
          await fetchUsers();
      } catch (error) {
          console.error(error);
          alert('Erreur lors de la demande.');
      } finally {
          setActionLoading(false);
      }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Filtrer uniquement ceux qui ont soumis un KYC
      const kycUsers = data.filter(u => u.kyc);
      // Trier: PENDING d'abord, puis par date
      kycUsers.sort((a, b) => {
          if (a.kyc.status === 'PENDING' && b.kyc.status !== 'PENDING') return -1;
          if (a.kyc.status !== 'PENDING' && b.kyc.status === 'PENDING') return 1;
          return new Date(b.kyc.submittedAt) - new Date(a.kyc.submittedAt);
      });
      
      setUsers(kycUsers);
    } catch (err) {
      console.error('Erreur chargement KYC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleReview = async (userId, status) => {
      setActionLoading(true);
      try {
        const token = localStorage.getItem('token');
        await fetch(`/api/admin/kyc/${userId}/review`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        await fetchUsers();
      } catch (error) {
          console.error(error);
          alert('Erreur modération KYC.');
      } finally {
          setActionLoading(false);
      }
  }

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>{t('status.pending', 'Chargement...')}</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="mb-2" style={{ color: 'var(--primary)' }}>{t('kyc.admin_title', "Validations d'identité (KYC)")}</h1>
      <p className="mb-4" style={{ color: 'var(--text-muted)' }}>{t('kyc.admin_desc', "Examinez les documents d'identité pour autoriser l'accès aux financements.")}</p>

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

      {/* Request Docs Modal */}
      {requestModalUser && (
          <div className="flex-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000}}>
              <div className="surface p-4" style={{ width: '400px', maxWidth: '90%', background: 'white', borderRadius: '8px' }}>
                  <h3 className="mb-3" style={{color: 'var(--primary)'}}>Demander des documents additionnels</h3>
                  <p className="mb-3 text-muted" style={{fontSize: '0.9rem'}}>Sélectionnez les documents que le citoyen doit fournir.</p>
                  
                  <div className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" id="chkWork" checked={docsReq.workCert} onChange={e => setDocsReq({...docsReq, workCert: e.target.checked})} /> 
                      <label htmlFor="chkWork">Attestation de travail</label>
                  </div>
                  <div className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" id="chkAddress" checked={docsReq.addressProof} onChange={e => setDocsReq({...docsReq, addressProof: e.target.checked})} /> 
                      <label htmlFor="chkAddress">Preuve d'adresse (Facture, Certificat)</label>
                  </div>
                  <div className="mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" id="chkOther" checked={docsReq.other} onChange={e => setDocsReq({...docsReq, other: e.target.checked})} /> 
                      <label htmlFor="chkOther">Autre document</label>
                  </div>

                  <div className="flex-between">
                      <button className="btn btn-outline" onClick={() => setRequestModalUser(null)}>Annuler</button>
                      <button className="btn btn-primary" onClick={handleRequestDocs} disabled={actionLoading || (!docsReq.workCert && !docsReq.addressProof && !docsReq.other)}>Envoyer la demande</button>
                  </div>
              </div>
          </div>
      )}

      {users.length === 0 ? (
          <p>{t('kyc.no_pending', 'Aucune demande KYC soumise.')}</p>
      ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             {users.map(user => (
                <div key={user.id} className="surface" style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                   
                   {/* Info basique */}
                   <div style={{ flex: 1 }}>
                       <div className="flex-between mb-2">
                           <h3><span onClick={() => setSelectedUserId(user.id)} style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}>{user.firstName} {user.lastName}</span></h3>
                           <span className={`badge badge-${user.kyc.status === 'APPROVED' ? 'success' : user.kyc.status === 'PENDING' ? 'pending' : 'danger'}`}>
                              {user.kyc.status}
                           </span>
                       </div>
                       <p className="mb-1" style={{ fontSize: '0.9rem' }}><strong>Email:</strong> {user.email}</p>
                       <p className="mb-1" style={{ fontSize: '0.9rem' }}><strong>{t('auth.phone', 'Téléphone')}:</strong> {user.phone}</p>
                       <p className="mb-1" style={{ fontSize: '0.9rem' }}><strong>{t('kyc.id_number', 'Numéro de pièce')}:</strong> {user.kyc.idNumber}</p>
                       <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('repayment.due_for', 'Soumis le')} {new Date(user.kyc.submittedAt).toLocaleDateString()}</p>
                   </div>

                   {/* Médias */}
                   <div style={{ display: 'flex', gap: '15px' }}>
                       <div style={{ textAlign: 'center' }}>
                         <p style={{ fontSize: '0.8rem', marginBottom: '5px' }}>{t('kyc.id_photo', "Pièce d'identité")}</p>
                         <div 
                           onClick={() => setSelectedImage(user.kyc.idPhotoUrl)}
                           style={{ width: '120px', height: '80px', background: '#eee', borderRadius: '4px', cursor: 'pointer', backgroundImage: `url(${user.kyc.idPhotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}
                         >
                            <ZoomIn size={16} style={{ position: 'absolute', bottom: '5px', right: '5px', color: 'white', filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.8))' }} />
                         </div>
                       </div>
                       <div style={{ textAlign: 'center' }}>
                         <p style={{ fontSize: '0.8rem', marginBottom: '5px' }}>{t('kyc.selfie', 'Selfie')}</p>
                         <div 
                           onClick={() => setSelectedImage(user.kyc.selfieUrl)}
                           style={{ width: '80px', height: '80px', background: '#eee', borderRadius: '4px', cursor: 'pointer', backgroundImage: `url(${user.kyc.selfieUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}
                         >
                            <ZoomIn size={16} style={{ position: 'absolute', bottom: '5px', right: '5px', color: 'white', filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.8))' }} />
                         </div>
                       </div>
                       
                       {/* Nouveaux Documents */}
                       {user.kyc.workCertUrl && (
                           <div style={{ textAlign: 'center' }}>
                             <p style={{ fontSize: '0.8rem', marginBottom: '5px' }}>Attestation</p>
                             <div 
                               onClick={() => setSelectedImage(user.kyc.workCertUrl)}
                               style={{ width: '80px', height: '80px', background: '#eee', borderRadius: '4px', cursor: 'pointer', backgroundImage: `url(${user.kyc.workCertUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}
                             >
                                <ZoomIn size={16} style={{ position: 'absolute', bottom: '5px', right: '5px', color: 'white', filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.8))' }} />
                             </div>
                           </div>
                       )}
                       {user.kyc.addressProofUrl && (
                           <div style={{ textAlign: 'center' }}>
                             <p style={{ fontSize: '0.8rem', marginBottom: '5px' }}>Preuve Adresse</p>
                             <div 
                               onClick={() => setSelectedImage(user.kyc.addressProofUrl)}
                               style={{ width: '80px', height: '80px', background: '#eee', borderRadius: '4px', cursor: 'pointer', backgroundImage: `url(${user.kyc.addressProofUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}
                             >
                                <ZoomIn size={16} style={{ position: 'absolute', bottom: '5px', right: '5px', color: 'white', filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.8))' }} />
                             </div>
                           </div>
                       )}
                       {user.kyc.otherDocUrl && (
                           <div style={{ textAlign: 'center' }}>
                             <p style={{ fontSize: '0.8rem', marginBottom: '5px' }}>Autre Doc</p>
                             <div 
                               onClick={() => setSelectedImage(user.kyc.otherDocUrl)}
                               style={{ width: '80px', height: '80px', background: '#eee', borderRadius: '4px', cursor: 'pointer', backgroundImage: `url(${user.kyc.otherDocUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}
                             >
                                <ZoomIn size={16} style={{ position: 'absolute', bottom: '5px', right: '5px', color: 'white', filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.8))' }} />
                             </div>
                           </div>
                       )}
                   </div>

                   {/* Actions (disponibles si statut non approuvé/rejeté, bien qu'on puisse changer d'avis) */}
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px' }}>
                       {user.kyc.status !== 'APPROVED' && (
                           <button onClick={() => setRequestModalUser(user.id)} disabled={actionLoading} className="btn btn-outline" style={{ color: 'var(--primary)', borderColor: 'var(--primary)', padding: '8px' }}>
                               Demander Documents
                           </button>
                       )}
                       {user.kyc.status !== 'APPROVED' && (
                           <button onClick={() => handleReview(user.id, 'APPROVED')} disabled={actionLoading} className="btn btn-outline" style={{ color: 'var(--success)', borderColor: 'var(--success)', padding: '8px' }}>
                               <Check size={18} /> {t('status.approved', 'Approuver')}
                           </button>
                       )}
                       {user.kyc.status !== 'REJECTED' && (
                           <button onClick={() => handleReview(user.id, 'REJECTED')} disabled={actionLoading} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '8px' }}>
                               <X size={18} /> {t('status.rejected', 'Rejeter')}
                           </button>
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

export default AdminKyc;
