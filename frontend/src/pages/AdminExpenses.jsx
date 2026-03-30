import React, { useState, useEffect } from 'react';
import { Banknote, Plus, Trash2, Calendar, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminExpenses = () => {
    const { t } = useTranslation();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: ''
    });

    const fetchExpenses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/expenses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setExpenses(Array.isArray(data) ? data : []);
            } else {
                setExpenses([]);
                console.error("Erreur backend sur /expenses:", await res.text());
            }
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/expenses', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            if(res.ok) {
                setFormData({
                    amount: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    invoiceNumber: ''
                });
                fetchExpenses();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            alert('Erreur lors de la soumission de la dépense.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if(!window.confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/expenses/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(res.ok) {
                fetchExpenses();
            } else {
                alert('Erreur lors de la suppression.');
            }
        } catch (error) {
            alert('Erreur système.');
        }
    };

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>Chargement...</div>;

    return (
        <div className="animate-fade-in">
            <h1 className="mb-2" style={{ color: 'var(--danger)' }}>Dépenses & Charges (Plateforme)</h1>
            <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Gérez les salaires, abonnements et toutes autres charges opérationnelles.</p>

            <div className="grid-cols-3 mb-4">
                 <div className="surface" style={{ borderTop: '4px solid var(--danger)' }}>
                    <div className="flex-between mb-2">
                        <p className="form-label" style={{ color: 'var(--text-muted)', margin: 0 }}>Total des Dépenses</p>
                        <Banknote color="var(--danger)" size={20} />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', margin: '10px 0', color: 'var(--danger)' }}>
                        {totalExpenses.toFixed(2)} MRU
                    </h2>
                    <p style={{ fontSize: '0.8rem' }} className="badge badge-danger">Toutes charges confondues</p>
                 </div>
            </div>

            <div className="grid-cols-2">
                <div>
                    <h3 className="mb-2">Ajouter une dépense manuelle</h3>
                    <div className="surface">
                        <form onSubmit={handleSubmit}>
                            <div className="form-group mb-3">
                                <label className="form-label">Montant (MRU) *</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="form-input" 
                                    name="amount" 
                                    value={formData.amount} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                            <div className="form-group mb-3">
                                <label className="form-label">Description / Détails *</label>
                                <textarea 
                                    className="form-input" 
                                    name="description" 
                                    rows="3"
                                    value={formData.description} 
                                    onChange={handleChange} 
                                    required 
                                    placeholder="Ex: Salaire employé X, Loyer bureau mensuel, Serveurs AWS..."
                                ></textarea>
                            </div>
                            <div className="form-group mb-3">
                                <label className="form-label">Date *</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="date" 
                                        className="form-input" 
                                        name="date" 
                                        value={formData.date} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                    <Calendar size={18} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">N° de Facture ou Reçu (Optionnel)</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        name="invoiceNumber" 
                                        value={formData.invoiceNumber} 
                                        onChange={handleChange} 
                                    />
                                    <FileText size={18} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%' }}>
                                <Plus size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                                {isSubmitting ? 'Enregistrement...' : 'Enregistrer la dépense'}
                            </button>
                        </form>
                    </div>
                </div>

                <div>
                    <h3 className="mb-2">Historique des Charges</h3>
                    <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
                        {expenses.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Aucune dépense enregistrée.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--surface-hover)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '15px', fontWeight: 500, color: 'var(--text-muted)' }}>Détails</th>
                                        <th style={{ padding: '15px', fontWeight: 500, color: 'var(--text-muted)' }}>Montant</th>
                                        <th style={{ padding: '15px', fontWeight: 500, color: 'var(--text-muted)' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map(exp => (
                                        <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ fontWeight: 500 }}>{exp.description}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    {new Date(exp.date).toLocaleDateString()} 
                                                    {exp.invoiceNumber && <span> | Réf: {exp.invoiceNumber}</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px', fontWeight: 'bold' }}>
                                                {exp.amount.toFixed(2)} MRU
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <button onClick={() => handleDelete(exp.id)} className="btn btn-outline" style={{ border: 'none', color: 'var(--danger)', padding: '5px' }}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminExpenses;
