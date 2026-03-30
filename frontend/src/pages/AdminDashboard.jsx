import { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import UserHistoryModal from '../components/UserHistoryModal';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [usersRes, invoicesRes] = await Promise.all([
          fetch('/api/admin/users', { headers }),
          fetch('/api/admin/invoices', { headers })
        ]);

        const usersData = await usersRes.json();
        const invoicesData = await invoicesRes.json();

        setUsers(usersData);
        setInvoices(invoicesData);
      } catch (error) {
        console.error('Erreur chargement données admin:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>Chargement...</div>;

  const pendingKycCount = users.filter(u => u.kyc?.status === 'PENDING').length;
  const pendingInvoicesCount = invoices.filter(i => i.status === 'PENDING').length;
  const totalFinanced = invoices
    .filter(i => ['PAID', 'PLANNED', 'FULLY_REPAID'].includes(i.status))
    .reduce((sum, i) => sum + i.amount, 0);

  // === NOUVELLES METRIQUES ===
  // 1. Total des revenus : Frais de service (5%, 10%, etc) confirmés + pénalités de retards payées.
  let totalRevenus = 0;
  invoices.forEach(inv => {
      const plan = inv.repaymentPlan;
      if (plan && plan.feePaid) {
          // Frais de service = pourcentage du montant initial
          totalRevenus += (inv.amount * plan.feePercentage) / 100;
          
          // Pénalités payées (penaltyApplied sur un installment qui a le statut PAID)
          plan.installments?.forEach(inst => {
              if (inst.status === 'PAID') {
                  totalRevenus += (inst.penaltyApplied || 0);
              }
          });
      }
  });

  // 2. Retardataires : Tous les plans ayant une mensualité "PENDING" dont la date est dépassée
  const lateInstallments = [];
  invoices.forEach(inv => {
      const plan = inv.repaymentPlan;
      if (plan && plan.installments) {
          plan.installments.forEach((inst, index) => {
              if (inst.status !== 'PAID') {
                  const dueDate = new Date(inst.dueDate);
                  const now = new Date();
                  if (now > dueDate) {
                      const diffTime = Math.abs(now - dueDate);
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const diffMonths = Math.ceil(diffDays / 30);
                      
                      lateInstallments.push({
                          user: inv.user,
                          invoice: inv,
                          installmentIndex: index + 1,
                          amountBase: inst.amount,
                          penalty: inst.dynamicPenalty || 0,
                          dueDate: dueDate,
                          diffDays,
                          diffMonths,
                          instId: inst.id
                      });
                  }
              }
          });
      }
  });
  
  // Trier les retardataires par gravité du retard (le plus long retard en premier)
  lateInstallments.sort((a, b) => b.diffDays - a.diffDays);

  return (
    <div className="animate-fade-in">
      <h1 className="mb-2" style={{ color: 'var(--danger)' }}>Dashboard Administrateur</h1>
      <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Vue d'ensemble de l'activité de la plateforme FinPay.</p>

      {/* KPIs Grid */}
      <div className="grid-cols-4 mb-4">
         <div className="surface" style={{ borderTop: '4px solid var(--primary)' }}>
            <div className="flex-between mb-2">
                <p className="form-label" style={{ color: 'var(--text-muted)', margin: 0 }}>Total Financements</p>
                <FileText color="var(--primary)" size={20} />
            </div>
            <h2 style={{ fontSize: '1.8rem', margin: '10px 0' }}>{totalFinanced.toFixed(2)} MRU</h2>
            <p style={{ fontSize: '0.8rem' }} className="badge badge-primary">Volume accordé</p>
         </div>

         <div className="surface" style={{ borderTop: '4px solid var(--success)' }}>
             <div className="flex-between mb-2">
                <p className="form-label" style={{ color: 'var(--text-muted)', margin: 0 }}>Revenus Financiers</p>
                <DollarSign color="var(--success)" size={20} />
             </div>
            <h2 style={{ fontSize: '1.8rem', margin: '10px 0', color: 'var(--success)' }}>{totalRevenus.toFixed(2)} MRU</h2>
            <p style={{ fontSize: '0.8rem' }} className="badge badge-success">Frais de service & Pénalités</p>
         </div>

         <div className="surface" style={{ borderTop: '4px solid var(--warning)' }}>
             <div className="flex-between mb-2">
                <p className="form-label" style={{ color: 'var(--text-muted)', margin: 0 }}>KYC en attente</p>
                <Users color="var(--warning)" size={20} />
             </div>
            <h2 style={{ fontSize: '1.8rem', margin: '10px 0' }}>{pendingKycCount}</h2>
            <p style={{ fontSize: '0.8rem' }} className="badge badge-pending">Vérifications requises</p>
         </div>

         <div className="surface" style={{ borderTop: '4px solid var(--danger)' }}>
             <div className="flex-between mb-2">
                <p className="form-label" style={{ color: 'var(--text-muted)', margin: 0 }}>Factures à valider</p>
                <Clock color="var(--danger)" size={20} />
             </div>
            <h2 style={{ fontSize: '1.8rem', margin: '10px 0' }}>{pendingInvoicesCount}</h2>
            <p style={{ fontSize: '0.8rem' }} className="badge badge-danger">Demandes en attente</p>
         </div>
      </div>

      <div className="grid-cols-1">
          <div>
              <h3 className="mb-2" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} /> Retardataires de Paiement
              </h3>
              <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
                  {lateInstallments.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Aucune échéance en retard pour le moment.
                      </div>
                  ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(239, 35, 60, 0.05)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>Client</th>
                            <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>Total à Recouvrer</th>
                            <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>Délai</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lateInstallments.slice(0, 10).map(late => (
                            <tr key={late.instId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '15px 20px', fontWeight: 500 }}>
                                  <span onClick={() => setSelectedUserId(late.user.id)} style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}>{late.user.firstName} {late.user.lastName}</span>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Facture: {late.invoice.provider}</div>
                              </td>
                              <td style={{ padding: '15px 20px', color: 'var(--danger)', fontWeight: 'bold' }}>
                                  {(late.amountBase + late.penalty).toFixed(2)} MRU
                                  <br/>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>
                                      {late.amountBase.toFixed(2)} + <span style={{ textDecoration: 'underline' }}>{late.penalty.toFixed(2)} pnl</span>
                                  </span>
                              </td>
                              <td style={{ padding: '15px 20px', color: 'var(--danger)', fontSize: '0.9rem' }}>
                                  {late.diffMonths} {late.diffMonths > 1 ? 'mois' : 'mois'} de retard
                                  <br/>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Échu le {late.dueDate.toLocaleDateString()})</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  )}
              </div>
          </div>
      </div>
      {selectedUserId && <UserHistoryModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
};

export default AdminDashboard;
