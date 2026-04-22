import { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Clock, DollarSign, AlertTriangle, Download } from 'lucide-react';
import UserHistoryModal from '../components/UserHistoryModal';
import { exportToCSV } from '../utils/exportCsv';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [detailModal, setDetailModal] = useState(null); // 'financement' | 'revenus'

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
      if (plan && (plan.feePaid || ['PAID', 'PLANNED', 'FULLY_REPAID'].includes(inv.status))) {
          // Frais de service = pourcentage du montant initial + 50 MRU frais fixes de transaction
          totalRevenus += ((inv.amount * plan.feePercentage) / 100) + 50;
          
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

  // === DATA POUR LE GRAPHIQUE ===
  const chartDataMap = {};
  invoices.forEach(inv => {
    if (['PAID', 'PLANNED', 'FULLY_REPAID'].includes(inv.status)) {
      const date = new Date(inv.submittedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      if (!chartDataMap[date]) {
        chartDataMap[date] = { date, 'Financements (MRU)': 0 };
      }
      chartDataMap[date]['Financements (MRU)'] += inv.amount;
    }
  });
  // Convertir en tableau et prendre les 14 derniers éléments
  const chartData = Object.values(chartDataMap).slice(-14);

  const handleExportSummary = () => {
    const rows = [
      { 'Indicateur': 'Total Financements', 'Valeur (MRU)': totalFinanced.toFixed(2) },
      { 'Indicateur': 'Revenus Financiers (Frais + Pénalités)', 'Valeur (MRU)': totalRevenus.toFixed(2) },
      { 'Indicateur': 'Utilisateurs Inscrits', 'Valeur (MRU)': users.length },
      { 'Indicateur': 'KYC en attente', 'Valeur (MRU)': pendingKycCount },
      { 'Indicateur': 'Factures en attente', 'Valeur (MRU)': pendingInvoicesCount },
      { 'Indicateur': 'Retardataires actifs', 'Valeur (MRU)': lateInstallments.length },
    ];
    exportToCSV(rows, 'resume_dashboard_finpay');
  };

  const handleExportLate = () => {
    const rows = lateInstallments.map(l => ({
      'Citoyen': `${l.user?.firstName} ${l.user?.lastName}`,
      'Téléphone': l.user?.phone || '',
      'Prestataire': l.invoice?.provider || '',
      'N° Facture': l.invoice?.invoiceNumber || '',
      'Mensualité': l.installmentIndex,
      'Montant Base (MRU)': l.amountBase?.toFixed(2) || '',
      'Pénalité (MRU)': l.penalty?.toFixed(2) || '',
      'Total Dû (MRU)': (l.amountBase + l.penalty)?.toFixed(2) || '',
      'Date Échéance': l.dueDate ? new Date(l.dueDate).toLocaleDateString() : '',
      'Jours de Retard': l.diffDays,
    }));
    exportToCSV(rows, 'retardataires_finpay');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between mb-4">
        <div>
          <h1 className="mb-2" style={{ color: 'var(--danger)' }}>Dashboard Administrateur</h1>
          <p style={{ color: 'var(--text-muted)' }}>Vue d'ensemble de l'activité de la plateforme FinPay.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportSummary} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <Download size={16} /> Résumé CSV
          </button>
          <button onClick={handleExportLate} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            <Download size={16} /> Retardataires CSV
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid-cols-4 mb-4">
         <div className="surface" style={{ borderTop: '4px solid var(--primary)' }}>
            <div className="flex-between mb-2">
                <p className="form-label" style={{ color: 'var(--text-muted)', margin: 0 }}>Total Financements</p>
                <FileText color="var(--primary)" size={20} />
            </div>
            <h2 style={{ fontSize: '1.8rem', margin: '10px 0' }}>{totalFinanced.toFixed(2)} MRU</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.8rem' }} className="badge badge-primary">Volume accordé</p>
              <button onClick={() => setDetailModal('financement')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Voir Détails</button>
            </div>
         </div>

         <div className="surface" style={{ borderTop: '4px solid var(--success)' }}>
             <div className="flex-between mb-2">
                <p className="form-label" style={{ color: 'var(--text-muted)', margin: 0 }}>Revenus Financiers</p>
                <DollarSign color="var(--success)" size={20} />
             </div>
            <h2 style={{ fontSize: '1.8rem', margin: '10px 0', color: 'var(--success)' }}>{totalRevenus.toFixed(2)} MRU</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.8rem' }} className="badge badge-success">Frais de service &amp; Pénalités</p>
              <button onClick={() => setDetailModal('revenus')} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Voir Détails</button>
            </div>
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

      {/* Analytics Chart */}
      {chartData.length > 0 && (
        <div className="surface mb-4">
          <h3 className="mb-4" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
             Financements Récents (14 derniers jours actifs)
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.toString()} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="Financements (MRU)" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorFin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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

      {/* Detail Modal for KPI Cards */}
      {detailModal && (() => {
        const isFinancement = detailModal === 'financement';
        const modalInvoices = isFinancement
          ? invoices.filter(i => ['PAID', 'PLANNED', 'FULLY_REPAID'].includes(i.status))
          : invoices.filter(i => i.repaymentPlan && (i.repaymentPlan.feePaid || ['PAID', 'PLANNED', 'FULLY_REPAID'].includes(i.status)));

        const exportDetail = () => {
          if (isFinancement) {
            const rows = modalInvoices.map(inv => ({
              'N\u00b0 Facture': inv.invoiceNumber || '',
              'Citoyen': `${inv.user?.firstName} ${inv.user?.lastName}`,
              'T\u00e9l\u00e9phone': inv.user?.phone || '',
              'Prestataire': inv.provider || '',
              'Montant (MRU)': inv.amount?.toFixed(2) || '',
              'Durée Plan': inv.repaymentPlan ? `${inv.repaymentPlan.duration} ${inv.repaymentPlan.durationType === 'DAYS' ? 'Jours' : 'Mois'}` : '',
              'Statut': inv.status || '',
              'Date': new Date(inv.submittedAt).toLocaleDateString(),
            }));
            exportToCSV(rows, 'detail_financements_finpay');
          } else {
            const rows = modalInvoices.map(inv => {
              const frais = ((inv.amount * (inv.repaymentPlan?.feePercentage || 0)) / 100) + 50;
              const penalites = inv.repaymentPlan?.installments
                ?.filter(i => i.status === 'PAID')
                .reduce((s, i) => s + (i.penaltyApplied || 0), 0) || 0;
              return {
                'N\u00b0 Facture': inv.invoiceNumber || '',
                'Citoyen': `${inv.user?.firstName} ${inv.user?.lastName}`,
                'T\u00e9l\u00e9phone': inv.user?.phone || '',
                'Montant Facture (MRU)': inv.amount?.toFixed(2) || '',
                'Frais (%)': inv.repaymentPlan?.feePercentage || '',
                'Frais Per\u00e7us (MRU)': frais.toFixed(2),
                'P\u00e9nalit\u00e9s Per\u00e7ues (MRU)': penalites.toFixed(2),
                'Total Revenus (MRU)': (frais + penalites).toFixed(2),
              };
            });
            exportToCSV(rows, 'detail_revenus_finpay');
          }
        };

        return (
          <div onClick={() => setDetailModal(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} className="surface animate-fade-in" style={{ width: '100%', maxWidth: '900px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
              <div className="flex-between mb-4">
                <h2 style={{ margin: 0, color: isFinancement ? 'var(--primary)' : 'var(--success)' }}>
                  {isFinancement ? '📊 Détail des Financements' : '💰 Détail des Revenus'}
                </h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={exportDetail} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Download size={16} /> Télécharger CSV
                  </button>
                  <button onClick={() => setDetailModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--text-muted)' }}>✕</button>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-color)' }}>
                    {isFinancement ? (
                      <>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Citoyen</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>N° Facture</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Prestataire</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Montant (MRU)</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Plan</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Citoyen</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>N° Facture</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Frais Perçus (MRU)</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Pénalités (MRU)</th>
                        <th style={{ padding: '10px', textAlign: 'right', color: 'var(--success)' }}>Total (MRU)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {modalInvoices.map(inv => {
                    const frais = ((inv.amount * (inv.repaymentPlan?.feePercentage || 0)) / 100) + 50;
                    const penalites = inv.repaymentPlan?.installments?.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.penaltyApplied || 0), 0) || 0;
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '10px' }}><span onClick={() => setSelectedUserId(inv.user?.id)} style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}>{inv.user?.firstName} {inv.user?.lastName}</span></td>
                        <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{inv.invoiceNumber}</td>
                        {isFinancement ? (
                          <>
                            <td style={{ padding: '10px' }}>{inv.provider}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{inv.amount?.toFixed(2)}</td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>{inv.repaymentPlan ? `${inv.repaymentPlan.duration} ${inv.repaymentPlan.durationType === 'DAYS' ? 'Jours' : 'Mois'}` : '—'}</td>
                            <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{new Date(inv.submittedAt).toLocaleDateString()}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{frais.toFixed(2)}</td>
                            <td style={{ padding: '10px', textAlign: 'right', color: 'var(--danger)' }}>{penalites.toFixed(2)}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{(frais + penalites).toFixed(2)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default AdminDashboard;
