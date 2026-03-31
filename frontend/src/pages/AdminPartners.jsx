import { useState, useEffect } from 'react';
import { Network, Plus, Trash2, Key, Copy, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminPartners = () => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ name: '', contactEmail: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newApiKey, setNewApiKey] = useState(null);
    const { t } = useTranslation();

    const fetchPartners = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/b2b/partners', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setPartners(data);
        } catch (err) {
            console.error('Erreur liste b2b:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleAdd = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setNewApiKey(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/b2b/partners', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if(!res.ok) {
                alert(data.error || "Erreur de création");
                return;
            }
            // Show the newly generated API Key directly to the admin
            setNewApiKey({ name: data.partner.name, key: data.apiKey });
            setFormData({ name: '', contactEmail: '' });
            fetchPartners();
        } catch (error) {
            alert('Erreur réseau');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`⚠️ ATTENTION ⚠️\nSupprimer ${name} coupera immédiatement tout leur accès API. Voulez-vous continuer ?`)) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/admin/b2b/partners/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchPartners();
        } catch (error) {
            alert('Erreur de suppression');
        }
    };

    const copyToClipboard = () => {
        if (newApiKey?.key) {
            navigator.clipboard.writeText(newApiKey.key);
            alert("Clé secrète copiée ! Transmettez-la de manière sécurisée.");
        }
    };

    if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>Chargement...</div>;

    return (
        <div className="animate-fade-in">
            <h1 className="mb-2" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Network size={28} /> {t('menu.admin_b2b', "Passerelle Bancaire (B2B)")}
            </h1>
            <p className="mb-4 text-muted" style={{ maxWidth: '800px' }}>
                Générez ici des clés secrètes d'API (API Keys) pour permettre à des banques partenaires (Bankily, Wave, etc.) 
                d'interroger votre base de données et de déclencher automatiquement le paiement des factures depuis leurs propres applications.
            </p>

            {newApiKey && (
                <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={20} /> ALERTE DE SÉCURITÉ: NOUVELLE CLÉ API
                    </h3>
                    <p style={{ margin: '0 0 15px 0', color: '#92400e' }}>
                        Le partenaire <strong>{newApiKey.name}</strong> a été créé. Voici sa clé privée de production. 
                        <strong> Cette clé ne sera plus jamais affichée !</strong> Veuillez la copier et la transmettre immédiatement à leurs développeurs informatiques de manière sécurisée.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <code style={{ flex: 1, padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px dashed #d97706', fontSize: '1.2rem', color: '#d97706', wordBreak: 'break-all' }}>
                            {newApiKey.key}
                        </code>
                        <button onClick={copyToClipboard} className="btn" style={{ background: '#d97706', color: 'white', display: 'flex', gap: '8px' }}>
                            <Copy size={16} /> Copier
                        </button>
                    </div>
                </div>
            )}

            <div className="grid-cols-2" style={{ alignItems: 'flex-start' }}>
                {/* Formulaire */}
                <div className="surface" style={{ borderTop: '4px solid var(--primary)' }}>
                    <h3 className="mb-3">Créer une Clé d'Intégration</h3>
                    <form onSubmit={handleAdd}>
                        <div className="form-group mb-3">
                            <label className="form-label">Nom de la Banque (ex: Bankily)</label>
                            <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} placeholder="Wave S.A." required />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label">Email de Contact Informatique (Optionnel)</label>
                            <input type="email" name="contactEmail" className="form-input" value={formData.contactEmail} onChange={handleChange} placeholder="dev.api@bankily.mr" />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%' }}>
                            <Key size={18} /> {isSubmitting ? 'Génération en cours...' : 'Générer la Clé Sécurisée API'}
                        </button>
                    </form>
                </div>

                {/* Liste existante */}
                <div>
                    <h3 className="mb-3" style={{ paddingLeft: '10px' }}>Partenaires Connectés ({partners.length})</h3>
                    {partners.length === 0 ? (
                        <p style={{ paddingLeft: '10px', color: 'var(--text-muted)' }}>Aucun partenaire bancaire trouvé.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {partners.map(p => (
                                <div key={p.id} className="surface flex-between" style={{ padding: '20px' }}>
                                    <div>
                                        <h4 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Network size={16} color="var(--primary)" /> {p.name}
                                        </h4>
                                        {p.contactEmail && <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.contactEmail}</p>}
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '10px' }}>
                                            <span style={{ fontSize: '0.75rem', background: p.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: p.isActive ? '#16a34a' : '#dc2626', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                                {p.isActive ? 'ACTIF (Production)' : 'SUSPENDU'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Créé le {new Date(p.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(p.id, p.name)} className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--border-color)', padding: '10px' }} title={"Révoquer " + p.name}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPartners;
