import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, MessageCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AboutUs = () => {
    const [contact, setContact] = useState(null);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchContact = async () => {
            try {
                const res = await fetch('/api/auth/settings/contact');
                const data = await res.json();
                setContact(data);
            } catch (error) {
                console.error("Erreur serveur", error);
            } finally {
                setLoading(false);
            }
        };
        fetchContact();
    }, []);

    if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}>Chargement...</div>;

    return (
        <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ color: 'var(--primary)', marginBottom: '10px' }}>À Propos & Contact</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Découvrez-en plus sur FinPay et contactez notre équipe</p>
            </div>

            <div className="grid-cols-2" style={{ alignItems: 'stretch' }}>
                {/* Section À Propos */}
                <div className="surface" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderTop: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <Info size={24} style={{ color: 'var(--primary)' }} />
                        <h2 style={{ margin: 0 }}>Notre Mission</h2>
                    </div>
                    <div style={{ flex: 1, color: 'var(--text-main)', lineHeight: '1.7', whiteSpace: 'pre-wrap', background: 'rgba(67, 97, 238, 0.03)', padding: '20px', borderRadius: '8px' }}>
                        {contact?.aboutText || "Bienvenue sur FinPay. Notre mission est de faciliter vos démarches financières grâce à une plateforme sécurisée et accessible à tous."}
                    </div>
                </div>

                {/* Section Contact */}
                <div className="surface" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderTop: '4px solid var(--success)' }}>
                    <h2 className="mb-4">Informations de Contact</h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div className="flex-center" style={{ width: '45px', height: '45px', background: 'rgba(67, 97, 238, 0.1)', color: 'var(--primary)', borderRadius: '10px' }}>
                                <MapPin size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 5px 0' }}>Adresse Physique</h4>
                                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{contact?.address || "Non renseigné"}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div className="flex-center" style={{ width: '45px', height: '45px', background: 'rgba(46, 196, 182, 0.1)', color: 'var(--success)', borderRadius: '10px' }}>
                                <Phone size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 5px 0' }}>Téléphone</h4>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 'bold' }}>{contact?.phone || "Non renseigné"}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div className="flex-center" style={{ width: '45px', height: '45px', background: 'rgba(239, 35, 60, 0.1)', color: 'var(--danger)', borderRadius: '10px' }}>
                                <Mail size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 5px 0' }}>Email</h4>
                                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{contact?.email || "Non renseigné"}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div className="flex-center" style={{ width: '45px', height: '45px', background: 'rgba(37, 211, 102, 0.1)', color: '#25D366', borderRadius: '10px' }}>
                                <MessageCircle size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 5px 0' }}>WhatsApp</h4>
                                <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 'bold' }}>{contact?.whatsapp || "Non renseigné"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutUs;
