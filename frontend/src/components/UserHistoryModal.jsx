import React, { useState, useEffect } from 'react';
import { X, User, FileText, CheckCircle, Clock, CreditCard, Shield, AlertTriangle, FileSignature } from 'lucide-react';
import EngagementDocument from './EngagementDocument';

const UserHistoryModal = ({ userId, onClose }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); // profile, kyc, invoices, payments
  const [viewingContract, setViewingContract] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/users/${userId}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur de chargement');
        const data = await res.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  const getInstallmentStatus = (inst) => {
    if (inst.status === 'PAID') return { label: 'Payé', color: 'success' };
    const isLate = new Date(inst.dueDate) < new Date() && inst.status !== 'PAID';
    if (inst.status === 'LATE' || isLate) return { label: 'En retard / Dû', color: 'danger' };
    return { label: 'En attente', color: 'pending' };
  };

  if (!userId) return null;

  return (
    <div className="animate-fade-in" style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, padding: '40px 20px',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start'
    }}>
      <div className="surface" style={{
          width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto',
          position: 'relative', padding: '30px'
      }}>
        <button 
            onClick={onClose} 
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
            <X size={24} />
        </button>

        {loading ? (
          <div className="flex-center" style={{ minHeight: '300px' }}>Chargement...</div>
        ) : error ? (
          <div className="flex-center" style={{ minHeight: '300px', color: 'var(--danger)' }}>{error}</div>
        ) : user ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                    {user.firstName[0]}{user.lastName[0]}
                </div>
                <div>
                    <h2 style={{ margin: '0 0 5px 0' }}>{user.firstName} {user.lastName}</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>{user.email} • {user.phone}</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <span className="badge badge-primary">Score: {user.creditScore}</span>
                        <span className={`badge badge-${user.status === 'ACTIVE' ? 'success' : 'danger'}`}>
                            {user.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                {['profile', 'kyc', 'invoices'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: 'none', border: 'none', padding: '10px 0', cursor: 'pointer',
                            fontSize: '1rem', fontWeight: 500,
                            color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent'
                        }}
                    >
                        {tab === 'profile' ? 'Aperçu' : tab === 'kyc' ? 'KYC & Identité' : 'Historique des Factures'}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ minHeight: '300px' }}>
                {activeTab === 'profile' && (
                    <div className="grid-cols-2">
                        <div className="surface" style={{ padding: '20px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><User size={20}/> Informations</h3>
                            <p><strong>Inscrit le:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                            <p><strong>Adresse:</strong> {user.address || 'Non spécifiée'}</p>
                            <p><strong>Emploi:</strong> {user.employment || 'Non spécifié'}</p>
                            <p><strong>Rôle:</strong> {user.role}</p>
                            <p><strong>Factures soumises:</strong> {user.invoices.length}</p>
                        </div>
                        <div className="surface" style={{ padding: '20px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Shield size={20}/> Statut KYC</h3>
                            {!user.kyc ? (
                                <p style={{ color: 'var(--text-muted)' }}>Non soumis</p>
                            ) : (
                                <>
                                    <p><strong>Statut:</strong> <span className={`badge badge-${user.kyc.status === 'APPROVED' ? 'success' : user.kyc.status === 'PENDING' ? 'pending' : 'danger'}`}>{user.kyc.status}</span></p>
                                    <p><strong>Numéro ID:</strong> {user.kyc.idNumber}</p>
                                    <p><strong>Soumis le:</strong> {new Date(user.kyc.submittedAt).toLocaleDateString()}</p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'kyc' && (
                    <div className="surface">
                        <h3 className="mb-4">Documents KYC</h3>
                        {!user.kyc ? (
                            <p style={{ color: 'var(--text-muted)' }}>Le citoyen n'a pas encore soumis ses documents KYC.</p>
                        ) : (
                            <div className="grid-cols-2">
                                <div>
                                    <p><strong>Carte d'identité</strong></p>
                                    <img src={`${user.kyc.idPhotoUrl}`} alt="ID" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                                <div>
                                    <p><strong>Selfie de sécurité</strong></p>
                                    <img src={`${user.kyc.selfieUrl}`} alt="Selfie" style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div>
                        {user.invoices.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>Aucune facture soumise pour le moment.</p>
                        ) : (
                            user.invoices.map(invoice => (
                                <div key={invoice.id} className="surface mb-4" style={{ padding: '20px', borderLeft: `4px solid ${invoice.status === 'FULLY_REPAID' ? 'var(--success)' : 'var(--primary)'}` }}>
                                    <div className="flex-between mb-4">
                                        <div>
                                            <h3 style={{ margin: '0 0 5px 0' }}>{invoice.provider} - fact n°{invoice.invoiceNumber}</h3>
                                            <p style={{ margin: 0, color: 'var(--text-muted)' }}>{invoice.amount} MRU • Soumis le {new Date(invoice.submittedAt).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`badge badge-${invoice.status === 'APPROVED' ? 'success' : invoice.status === 'PENDING' ? 'pending' : invoice.status === 'REJECTED' ? 'danger' : 'primary'}`}>
                                            {invoice.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    
                                    {invoice.repaymentPlan && (
                                        <div style={{ marginTop: '20px', padding: '15px', background: 'var(--surface-hover)', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <h4 style={{ margin: 0 }}>Plan de Remboursement Actif</h4>
                                                {invoice.repaymentPlan.commitmentSigned && (
                                                    <button onClick={() => setViewingContract(invoice)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '5px 10px', display: 'flex', alignItems: 'center' }}>
                                                        <FileSignature size={14} style={{ marginRight: '5px' }} /> Voir l'engagement
                                                    </button>
                                                )}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.9rem' }}>
                                                <strong>Durée:</strong> {invoice.repaymentPlan.duration} {invoice.repaymentPlan.durationType === 'DAYS' ? 'Jours' : 'Mois'} | 
                                                <strong> Total initial:</strong> {invoice.repaymentPlan.totalAmount} MRU
                                            </p>
                                            
                                            <div style={{ marginTop: '15px' }}>
                                                {invoice.repaymentPlan.installments.map((inst, idx) => (
                                                    <div key={inst.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
                                                        <span><Clock size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }}/> Mensualité {idx + 1}</span>
                                                        <span>
                                                            {inst.amount.toFixed(2)} MRU
                                                            {inst.dynamicPenalty > 0 && (
                                                                <span style={{ color: 'var(--danger)', fontSize: '0.85rem', display: 'block' }}>
                                                                    + {inst.dynamicPenalty.toFixed(2)} MRU (Pénalité 5%)
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span>{new Date(inst.dueDate).toLocaleDateString()}</span>
                                                        <span className={`badge badge-${getInstallmentStatus(inst).color}`}>
                                                            {getInstallmentStatus(inst).color === 'danger' && <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }} />}
                                                            {getInstallmentStatus(inst).label}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
          </>
        ) : null}
      </div>
      
      {/* Fullscreen Document Viewer */}
      {viewingContract && (
          <EngagementDocument 
              user={user} 
              invoice={viewingContract} 
              onClose={() => setViewingContract(null)} 
          />
      )}
    </div>
  );
};

export default UserHistoryModal;
