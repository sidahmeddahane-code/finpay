import React, { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../config/api';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.isRead).length);
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setIsOpen(false);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) {
      markAsRead(n.id);
    }
    setIsOpen(false);

    const isAdmin = window.location.pathname.startsWith('/admin');
    let targetPath = isAdmin ? '/admin/dashboard' : '/dashboard';
    const titleLower = n.title.toLowerCase();

    if (isAdmin) {
      if (titleLower.includes('kyc') || titleLower.includes('documents')) targetPath = '/admin/kyc';
      else if (titleLower.includes('facture') || titleLower.includes('frais')) targetPath = '/admin/invoices';
      else if (titleLower.includes('preuve de paiement') || titleLower.includes('paiement')) targetPath = '/admin/payments';
    } else {
      if (titleLower.includes('kyc') || (titleLower.includes('documents') && !titleLower.includes('facture'))) targetPath = '/profile';
      else if (titleLower.includes('facture') || titleLower.includes('frais') || titleLower.includes('paiement')) targetPath = '/my-invoices';
    }

    navigate(targetPath);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="btn surface" 
        style={{ width: '45px', height: '45px', borderRadius: '50%', padding: '0', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--surface-light)', color: 'var(--text-main)', border: '1px solid var(--border-color)', position: 'relative' }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span 
            className="animate-pulse-ring"
            style={{ 
            background: 'var(--danger)', 
            color: 'white', 
            borderRadius: '50%', 
            padding: '2px 6px', 
            fontSize: '0.7rem',
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            fontWeight: 'bold'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: '120%', 
          right: 0, 
          width: '320px', 
          minWidth: '280px',
          background: 'var(--surface-light)', 
          boxShadow: '0 -4px 12px rgba(0,0,0,0.15)', 
          borderRadius: '8px', 
          zIndex: 9999, 
          maxHeight: '350px', 
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem' }}>
                Tout marquer lu
              </button>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '5px' }}>
            {notifications.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '10px' }}>Aucune notification</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} 
                  onClick={() => handleNotificationClick(n)}
                  style={{ 
                  padding: '10px', 
                  borderBottom: '1px solid var(--border-color)', 
                  background: n.isRead ? 'transparent' : 'rgba(20, 184, 166, 0.1)',
                  borderRadius: '4px',
                  marginBottom: '5px',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>{n.title}</h4>
                    {!n.isRead && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }} title="Marquer comme lu"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{n.message}</p>
                  <span style={{ fontSize: '0.65rem', color: '#aaa', marginTop: '5px', display: 'block' }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
