import React from 'react';
import { X, Printer } from 'lucide-react';

const EngagementDocument = ({ user, invoice, onClose }) => {
  const plan = invoice.repaymentPlan;
  
  if (!plan) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-center animate-fade-in" style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, padding: '20px', overflowY: 'auto'
    }}>
      <div style={{ width: '100%', maxWidth: '800px', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
        {/* Controls (Hidden on Print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={handlePrint} className="btn btn-primary" style={{ padding: '8px 15px' }}>
                <Printer size={18} style={{ marginRight: '5px' }} /> Imprimer / PDF
            </button>
            <button onClick={onClose} className="btn btn-outline" style={{ background: 'white', padding: '8px 15px' }}>
                <X size={18} style={{ marginRight: '5px' }} /> Fermer
            </button>
        </div>

        {/* Printable Area */}
        <div className="printable-document" style={{
            background: 'white', padding: '40px 60px', borderRadius: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            fontFamily: '"Times New Roman", Times, serif', color: '#000', lineHeight: 1.6
        }}>
            
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #000', paddingBottom: '20px' }}>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '24px', textTransform: 'uppercase' }}>Contrat d'Engagement de Remboursement</h1>
                <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>Réf: FI-{invoice.id.split('-')[0].toUpperCase()} / Date: {new Date(plan.createdAt).toLocaleDateString()}</p>
            </div>

            {/* Parties */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ textDecoration: 'underline', marginBottom: '15px' }}>Entre les soussignés :</h3>
                <p style={{ marginBottom: '10px' }}>
                    <strong>La plateforme FinPay</strong>, ci-après dénommée <em>« Le Prestataire »</em>,
                </p>
                <p>ET</p>
                <p style={{ marginTop: '10px' }}>
                    <strong>Monsieur/Madame {user.firstName} {user.lastName}</strong>,<br/>
                    Titulaire de la pièce d'identité N° <strong>{user.kyc ? user.kyc.idNumber : 'Non spécifié'}</strong>,<br/>
                    Inscrit(e) sous l'adresse email : <strong>{user.email}</strong>, et numéro de téléphone : <strong>{user.phone}</strong>,<br/>
                    Ci-après dénommé(e) <em>« Le Débiteur »</em>.
                </p>
            </div>

            {/* Objet */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ textDecoration: 'underline', marginBottom: '15px' }}>1. Objet du Contrat</h3>
                <p>
                    Le présent contrat a pour objet de formaliser l'engagement du Débiteur à rembourser la facture <strong>{invoice.category}</strong> (Prestataire initial : <strong>{invoice.provider}</strong>, Réf : <strong>{invoice.invoiceNumber}</strong>) dont le montant total s'élève à <strong>{invoice.amount.toFixed(2)} MRU</strong>.
                    <br/><br/>
                    La plateforme FinPay a procédé ou procèdera au règlement intégral de cette facture auprès du prestataire initial.
                </p>
            </div>

            {/* Modalités de Remboursement */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ textDecoration: 'underline', marginBottom: '15px' }}>2. Modalités de Remboursement</h3>
                <p>
                    Le Débiteur s'engage à rembourser le montant exact de la facture, soit <strong>{invoice.amount.toFixed(2)} MRU</strong>, réparti sur une durée de <strong>{plan.durationMonths} mois</strong>.
                    <br/><br/>
                    Le montant de chaque mensualité est fixé à <strong>{(invoice.amount / plan.durationMonths).toFixed(2)} MRU</strong>.
                    Ces paiements s'effectuent sans toucher aux frais initiaux de service de <strong>{plan.feePercentage}%</strong> qui ont déjà été réglés séparément par le Débiteur pour activer ce plan.
                </p>
            </div>

            {/* Pénalités de Retard */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ textDecoration: 'underline', marginBottom: '15px' }}>3. Pénalités de Retard</h3>
                <p>
                    En cas de non-respect de l'échéancier convenu, le Débiteur s'expose à des pénalités de retard.
                    <br/><br/>
                    Il est expressément convenu qu'une pénalité forfaitaire représentant <strong>5% du montant total de la facture originale</strong> ({ (invoice.amount * 0.05).toFixed(2) } MRU) sera automatiquement appliquée pour <strong>chaque mois de retard entamé</strong> sur une échéance non réglée à date.
                </p>
            </div>

            {/* Signature */}
            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '45%' }}>
                    <p style={{ fontWeight: 'bold' }}>Pour FinPay (Le Prestataire)</p>
                    <div style={{ marginTop: '10px', height: '60px', borderBottom: '1px dotted #000' }}>
                        <em>Validé électroniquement par la direction.</em>
                    </div>
                </div>
                <div style={{ width: '45%' }}>
                    <p style={{ fontWeight: 'bold' }}>Le Débiteur</p>
                    <p style={{ fontSize: '12px', color: '#555', margin: '5px 0' }}>
                        <em>« Lu et approuvé, bon pour accord »</em><br/>
                        Signé électroniquement via la plateforme FinPay.
                    </p>
                    <div style={{ marginTop: '10px', height: '60px', borderBottom: '1px dotted #000', display: 'flex', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '12px' }}>Date : {new Date(plan.createdAt).toLocaleString()}</span>
                    </div>
                    <p style={{ fontSize: '10px', marginTop: '5px' }}>Adresse IP vérifiée par le système.</p>
                </div>
            </div>

        </div>

        {/* Global Print Styles inside component for convenience */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-document, .printable-document * {
              visibility: visible;
            }
            .printable-document {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              box-shadow: none !important;
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}} />
      </div>
    </div>
  );
};

export default EngagementDocument;
