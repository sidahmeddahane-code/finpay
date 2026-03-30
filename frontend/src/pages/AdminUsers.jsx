import React, { useState, useEffect } from 'react';
import { Users, Search, ShieldOff, Shield, Trash2 } from 'lucide-react';
import UserHistoryModal from '../components/UserHistoryModal';

const isSuperAdmin = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'SUPER_ADMIN';
  } catch { return false; }
};

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const superAdmin = isSuperAdmin();

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error('Erreur chargement utilisateurs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleBlock = async (id) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/users/${id}/block`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) fetchUsers();
        else alert((await res.json()).error);
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Supprimer définitivement ${name} ? Cette action est irréversible.`)) return;
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) fetchUsers();
        else alert((await res.json()).error);
    };

    // Filtrer les utilisateurs par nom, téléphone ou email
    const filteredUsers = users.filter(user => {
        const search = searchTerm.toLowerCase();
        return (
            (user.firstName || '').toLowerCase().includes(search) ||
            (user.lastName || '').toLowerCase().includes(search) ||
            (user.phone || '').includes(search) ||
            (user.email || '').toLowerCase().includes(search)
        );
    });

    if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>Chargement...</div>;

    return (
        <div className="animate-fade-in relative">
            <div className="flex-between mb-4">
                <div>
                    <h1 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users color="var(--primary)" /> Gestion des Utilisateurs
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Consultez la liste des inscrits, leur historique et statut KYC.</p>
                </div>
                
                {/* Barre de recherche */}
                <div style={{ position: 'relative', width: '300px' }}>
                    <input 
                        type="text" 
                        placeholder="Rechercher (nom, tél, email)..." 
                        className="form-input" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                </div>
            </div>

            <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--surface-hover)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>Nom Complet</th>
                            <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>Contact</th>
                            <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>Statut</th>
                            <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>Statut KYC</th>
                            <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>Demandes (Factures)</th>
                            <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>Inscription</th>
                            {superAdmin && <th style={{ padding: '15px 20px', fontWeight: 500, color: 'var(--text-muted)' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun utilisateur trouvé.</td>
                            </tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '15px 20px', fontWeight: 500 }}>
                                    <span
                                        onClick={() => setSelectedUserId(user.id)}
                                        style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}
                                    >
                                        {user.firstName} {user.lastName}
                                    </span>
                                </td>
                                <td style={{ padding: '15px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {user.email}<br />{user.phone}
                                </td>
                                <td style={{ padding: '15px 20px' }}>
                                    <span className={`badge ${
                                        user.status === 'ACTIVE'    ? 'badge-success' :
                                        user.status === 'BLOCKED'   ? 'badge-danger' : 'badge-pending'
                                    }`}>{user.status}</span>
                                </td>
                                <td style={{ padding: '15px 20px' }}>
                                    {!user.kyc ? <span className="badge">Non soumis</span> :
                                        <span className={`badge badge-${user.kyc.status === 'APPROVED' ? 'success' : user.kyc.status === 'PENDING' ? 'pending' : 'danger'}`}>
                                            {user.kyc.status}
                                        </span>
                                    }
                                </td>
                                <td style={{ padding: '15px 20px', color: 'var(--text-muted)' }}>
                                    {user._count?.invoices || 0} demande(s)
                                </td>
                                <td style={{ padding: '15px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                {superAdmin && (
                                    <td style={{ padding: '15px 20px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleBlock(user.id)}
                                                className="btn btn-outline"
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '0.78rem',
                                                    color: user.status === 'BLOCKED' ? '#22c55e' : '#f59e0b',
                                                    borderColor: user.status === 'BLOCKED' ? '#22c55e' : '#f59e0b'
                                                }}
                                                title={user.status === 'BLOCKED' ? 'Débloquer' : 'Bloquer'}
                                            >
                                                {user.status === 'BLOCKED' ? <Shield size={14} /> : <ShieldOff size={14} />}
                                                {user.status === 'BLOCKED' ? ' Débloquer' : ' Bloquer'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)}
                                                className="btn btn-outline"
                                                style={{ padding: '6px 10px', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.78rem' }}
                                                title="Supprimer"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de profil utilisateur plein écran */}
            {selectedUserId && <UserHistoryModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
        </div>
    );
};

export default AdminUsers;
