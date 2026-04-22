const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth, isAdmin, isSuperAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { calculatePenalty } = require('../utils/penalty');
const sendSms = require('../utils/sendSms');

const prisma = new PrismaClient();

// ── Audit log helper ───────────────────────────────────────────────────────
async function logAction(adminId, adminName, action, targetType, targetId, details = null) {
  try {
    await prisma.adminActionLog.create({
      data: { adminId, adminName, action, targetType, targetId, details }
    });
  } catch (e) {
    console.error('logAction error:', e.message);
  }
}
// ──────────────────────────────────────────────────────────────────────────

// Liste de tous les utilisateurs
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        kyc: true,
        _count: { select: { invoices: true } }
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
  }
});

// Historique complet d'un utilisateur
router.get('/users/:userId/history', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        kyc: true,
        invoices: {
          include: {
            repaymentPlan: {
              include: {
                installments: {
                  include: { payment: true },
                  orderBy: { dueDate: 'asc' }
                }
              }
            }
          },
          orderBy: { submittedAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    // Attach dynamic penalty to installments
    user.invoices.forEach(inv => {
      if (inv.repaymentPlan && inv.repaymentPlan.installments) {
        inv.repaymentPlan.installments = inv.repaymentPlan.installments.map(inst => ({
          ...inst,
          dynamicPenalty: calculatePenalty(inst, inv.amount)
        }));
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique.' });
  }
});

// Réviser KYC
router.post('/kyc/:userId/review', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body; // 'APPROVED' ou 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide.' });
    }

    const kyc = await prisma.kycVerification.update({
        where: { userId },
        data: { status, reviewedAt: new Date() }
    });

    await logAction(req.user.userId, req.user.name || 'Admin', status === 'APPROVED' ? 'APPROVE_KYC' : 'REJECT_KYC', 'KYC', userId, `Statut: ${status}`);

    await prisma.notification.create({
      data: {
        userId,
        title: status === 'APPROVED' ? 'KYC Approuvé' : 'KYC Rejeté',
        message: status === 'APPROVED' ? 'Votre vérification d\'identité a été approuvée.' : 'Votre vérification d\'identité a été rejetée. Veuillez vérifier les informations et réessayer.'
      }
    });

    res.json({ message: `Le KYC a été ${status === 'APPROVED' ? 'approuvé' : 'rejeté'}.`, kyc });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la révision du KYC.' });
  }
});

// Demander des documents supplémentaires (KYC)
router.post('/kyc/:userId/request-docs', auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { requestedDocs } = req.body; // e.g., "attestation_travail,certificat_residence"

    if (!requestedDocs) {
      return res.status(400).json({ error: 'Veuillez spécifier les documents requis.' });
    }

    const kyc = await prisma.kycVerification.update({
        where: { userId },
        data: { status: 'INFO_REQUIRED', requestedDocs, reviewedAt: new Date() }
    });

    await prisma.notification.create({
        data: {
            userId,
            title: 'Action Requise : Documents Manquants',
            message: 'L\'administrateur a demandé des documents supplémentaires pour valider votre identité. Veuillez consulter votre profil.'
        }
    });

    await logAction(req.user.userId, req.user.name || 'Admin', 'REQUEST_KYC_DOCS', 'KYC', userId, requestedDocs);

    res.json({ message: 'Demande de documents envoyée avec succès.', kyc });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la demande de documents.' });
  }
});

// Liste de toutes les factures
router.get('/invoices', auth, isAdmin, async (req, res) => {
    try {
        const invoices = await prisma.invoice.findMany({
            include: { 
                user: true, 
                repaymentPlan: {
                    include: {
                        installments: {
                            orderBy: { dueDate: 'asc' }
                        }
                    }
                } 
            },
            orderBy: { submittedAt: 'desc' }
        });

        // Add dynamic penalty to each fetched installment
        const invoicesWithPenalties = invoices.map(inv => {
            if (inv.repaymentPlan && inv.repaymentPlan.installments) {
                inv.repaymentPlan.installments = inv.repaymentPlan.installments.map(inst => ({
                    ...inst,
                    dynamicPenalty: calculatePenalty(inst, inv.amount)
                }));
            }
            return inv;
        });

        res.json(invoicesWithPenalties);
    } catch (error) {
        res.status(500).json({ error: 'Erreur récupération factures' });
    }
});

// Demander des informations supplémentaires pour une facture
router.post('/invoices/:invoiceId/request-info', auth, isAdmin, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { requestedDocs } = req.body;

        if (!requestedDocs) {
            return res.status(400).json({ error: 'Veuillez spécifier les documents requis.' });
        }

        const invoice = await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: 'INFO_REQUIRED', requestedDocs },
            include: { user: true }
        });

        const sendSms = require('../utils/sendSms');
        await sendSms({
            phone: invoice.user.phone,
            message: `FinPay: Action requise pour votre facture (Réf: ${invoice.invoiceNumber}). Des documents additionnels sont demandés. Consultez votre compte.`
        }).catch(e => console.error(e));

        await logAction(req.user.userId, req.user.name || 'Admin', 'REQUEST_INVOICE_DOCS', 'INVOICE', invoiceId, requestedDocs);

        await prisma.notification.create({
            data: {
                userId: invoice.user.id,
                title: 'Action requise : Facture',
                message: `Des documents additionnels sont demandés pour votre facture (Réf: ${invoice.invoiceNumber}).`
            }
        });

        res.json({ message: 'Demande de documents additionnels envoyée avec succès.', invoice });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la demande de documents.' });
    }
});

// Approuver/Refuser facture
router.post('/invoices/:invoiceId/review', auth, isAdmin, async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { status } = req.body; // 'APPROVED' ou 'REJECTED'

        const invoice = await prisma.invoice.update({
            where: { id: invoiceId },
            data: { status, approvedAt: status === 'APPROVED' ? new Date() : null },
            include: { user: true }
        });

        await sendSms({
            phone: invoice.user.phone,
            message: `FinPay: Votre facture (Réf: ${invoice.invoiceNumber}) a été ${status === 'APPROVED' ? 'APPROUVÉE ✅' : 'REFUSÉE ❌'}.`
        });

        await logAction(req.user.userId, req.user.name || 'Admin', status === 'APPROVED' ? 'APPROVE_INVOICE' : 'REJECT_INVOICE', 'INVOICE', invoiceId, `Réf: ${invoice.invoiceNumber}`);

        await prisma.notification.create({
            data: {
                userId: invoice.user.id,
                title: status === 'APPROVED' ? 'Facture Approuvée' : 'Facture Refusée',
                message: `Votre facture (Réf: ${invoice.invoiceNumber}) a été ${status === 'APPROVED' ? 'approuvée' : 'refusée'}.`
            }
        });

        res.json({ message: `Facture ${status === 'APPROVED' ? 'approuvée' : 'refusée'}`, invoice });
    } catch (error) {
        res.status(500).json({ error: 'Erreur révision facture.' });
    }
});

// L'entreprise paie la facture (ça active le plan de financement pour le client)
router.post('/invoices/:invoiceId/pay', auth, isAdmin, upload.single('paymentProof'), async (req, res) => {
    try {
        const { invoiceId } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'La preuve de paiement au fournisseur est requise.' });
        }

        const adminPaymentProofUrl = req.file.path; // Cloudinary URL

        const invoice = await prisma.invoice.update({
            where: { id: invoiceId, status: 'READY_TO_PAY' },
            data: { 
                status: 'PAID',
                paidByAdminAt: new Date(),
                adminPaymentProofUrl
             },
            include: { user: true }
        });

        await sendSms({
            phone: invoice.user.phone,
            message: `FinPay: Votre facture a été PAYÉE au fournisseur. Votre plan d'échelonnement est maintenant ACTIF ! 🎉`
        });

        await logAction(req.user.userId, req.user.name || 'Admin', 'PAY_INVOICE_TO_PROVIDER', 'INVOICE', invoiceId, 'Preuve uploadée');

        await prisma.notification.create({
            data: {
                userId: invoice.user.id,
                title: 'Facture Payée',
                message: 'Votre facture a été payée au fournisseur. Votre plan d\'échelonnement est maintenant Actif !'
            }
        });

        res.json({ message: `Facture payée. La preuve a été enregistrée. Le plan du citoyen est officiellement actif.`, invoice });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors du paiement admin de la facture.' });
    }
});

// Valider la preuve de paiement des frais initiaux (10% par ex.)
router.post('/repayment-plans/:planId/review-fee', auth, isAdmin, async (req, res) => {
    try {
        const { planId } = req.params;
        const { status } = req.body; // 'APPROVED' ou 'REJECTED'
        
        const plan = await prisma.repaymentPlan.findUnique({
            where: {id: planId},
            include: { invoice: { include: { user: true } } }
        });

        if (!plan || plan.status !== 'FEE_VERIFYING') {
            return res.status(404).json({error: 'Plan introuvable ou déjà traité.'});
        }
        
        if (status === 'APPROVED') {
            await prisma.repaymentPlan.update({ where: {id: planId}, data: {status: 'ACTIVE', feePaid: true} });
            await prisma.invoice.update({ where: {id: plan.invoiceId}, data: {status: 'READY_TO_PAY'} });
            await sendSms({ phone: plan.invoice.user.phone, message: `FinPay: Les frais d'engagement ont été VALIDÉS. La facture passera en paiement.` });
            await logAction(req.user.userId, req.user.name || 'Admin', 'APPROVE_FEE', 'PLAN', planId, `Facture: ${plan.invoiceId}`);
            
            await prisma.notification.create({
                data: {
                    userId: plan.invoice.userId,
                    title: 'Frais Validés',
                    message: 'Les frais d\'engagement ont été validés. La facture passera en paiement.'
                }
            });
            res.json({message: 'Frais validés. Facture prête pour paiement au fournisseur.'});
        } else {
            await prisma.installment.deleteMany({where: {planId: planId}});
            await prisma.repaymentPlan.delete({where: {id: planId}});
            await prisma.invoice.update({ where: {id: plan.invoiceId}, data: {status: 'APPROVED'} });
            await sendSms({ phone: plan.invoice.user.phone, message: `FinPay: Preuve de frais REFUSÉE. Veuillez resoumettre l'engagement.` });
            await logAction(req.user.userId, req.user.name || 'Admin', 'REJECT_FEE', 'PLAN', planId, `Facture: ${plan.invoiceId}`);
            
            await prisma.notification.create({
                data: {
                    userId: plan.invoice.userId,
                    title: 'Preuve de frais refusée',
                    message: 'Preuve de frais refusée. Veuillez resoumettre l\'engagement.'
                }
            });
            res.json({message: 'Preuve refusée, le plan a été annulé. Le client devra recommencer.'});
        }
    } catch(err) {
        res.status(500).json({ error: 'Erreur lors de la validation des frais.' });
    }
});

// --- GESTION DES PREUVES DE PAIEMENT ---

// Liste des paiements (preuves) soumis
router.get('/payments', auth, isAdmin, async (req, res) => {
    try {
        const payments = await prisma.payment.findMany({
            include: { 
                installment: { 
                    include: { plan: { include: { invoice: { include: { user: true } } } } } 
                } 
            },
            orderBy: { paidAt: 'desc' }
        });
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Erreur récupération des paiements.' });
    }
});

// Approuver ou rejeter une preuve de paiement
router.post('/payments/:paymentId/review', auth, isAdmin, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { status } = req.body; // 'APPROVED' ou 'REJECTED'

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { 
               installment: {
                  include: {
                     plan: { include: { invoice: { include: { user: true } } } }
                  }
               } 
            }
        });

        if (!payment || payment.status !== 'PENDING') {
            return res.status(404).json({ error: 'Paiement introuvable ou déjà traité.' });
        }

        if (status === 'REJECTED') {
            await prisma.payment.update({ where: { id: paymentId }, data: { status: 'REJECTED', reviewedAt: new Date() } });
            await prisma.installment.update({ where: { id: payment.installmentId }, data: { status: 'PENDING' } });
            await sendSms({ phone: payment.installment.plan.invoice.user.phone, message: `FinPay: La preuve de paiement pour votre échéance a été REFUSÉE.` });
            await logAction(req.user.userId, req.user.name || 'Admin', 'REJECT_PAYMENT', 'PAYMENT', paymentId);
            
            await prisma.notification.create({
                data: {
                    userId: payment.installment.plan.invoice.userId,
                    title: 'Paiement Refusé',
                    message: 'La preuve de paiement pour votre échéance a été refusée.'
                }
            });
            return res.json({ message: 'Preuve de paiement refusée. Le client devra recommencer.' });
        }

        if (status === 'APPROVED') {
            await prisma.payment.update({ where: { id: paymentId }, data: { status: 'APPROVED', reviewedAt: new Date() } });
            await prisma.installment.update({ where: { id: payment.installmentId }, data: { status: 'PAID' } });
            await sendSms({ phone: payment.installment.plan.invoice.user.phone, message: `FinPay: Merci ! Le paiement de votre échéance a été VALIDÉ.` });
            await logAction(req.user.userId, req.user.name || 'Admin', 'APPROVE_PAYMENT', 'PAYMENT', paymentId);
            
            await prisma.notification.create({
                data: {
                    userId: payment.installment.plan.invoice.userId,
                    title: 'Paiement Validé',
                    message: 'Le paiement de votre échéance a été validé !'
                }
            });

            if (payment.installment?.plan?.invoice) {
                await prisma.user.update({ where: { id: payment.installment.plan.invoice.userId }, data: { creditScore: { increment: 5 } } });
            }

            const allInstallments = await prisma.installment.findMany({ where: { planId: payment.installment.planId } });
            const allPaid = allInstallments.every(inst => inst.status === 'PAID');

            if (allPaid) {
                await prisma.repaymentPlan.update({ where: { id: payment.installment.planId }, data: { status: 'COMPLETED' } });
                const plan = await prisma.repaymentPlan.findUnique({ where: { id: payment.installment.planId } });
                await prisma.invoice.update({ where: { id: plan.invoiceId }, data: { status: 'FULLY_REPAID' } });
            }
            return res.json({ message: 'Paiement approuvé. Échéance validée.' });
        }

    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la validation du paiement.' });
    }
});

// --- GESTION DES MOYENS DE PAIEMENTS (Comptes de l'entreprise où recevoir l'argent) ---

router.get('/payment-methods', auth, isAdmin, async (req, res) => {
    try {
        const methods = await prisma.paymentMethod.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(methods);
    } catch (error) {
         res.status(500).json({ error: 'Erreur' });
    }
});

router.post('/payment-methods', auth, isAdmin, upload.single('logo'), async (req, res) => {
    try {
        const { name, provider, accountNumber } = req.body;
        const logoUrl = req.file ? req.file.path : null;

        const newMethod = await prisma.paymentMethod.create({
            data: { name, provider, accountNumber, logoUrl }
        });
        res.json(newMethod);
    } catch (error) {
         console.error('Erreur Upload Logo:', error);
         res.status(500).json({ error: 'Erreur création méthode de paiement.' });
    }
});

router.delete('/payment-methods/:id', auth, isAdmin, async (req, res) => {
    try {
        await prisma.paymentMethod.delete({ where: { id: req.params.id } });
        res.json({ message: 'Méthode de paiement supprimée.' });
    } catch (error) {
         res.status(500).json({ error: 'Erreur suppression méthode.' });
    }
});

// ==========================================
// EXPENSES (DÉPENSES DE LA PLATEFORME)
// ==========================================

router.get('/expenses', auth, isAdmin, async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des dépenses' });
    }
});

router.post('/expenses', auth, isAdmin, async (req, res) => {
    try {
        const { amount, description, date, invoiceNumber } = req.body;
        
        if (!amount || !description || !date) {
            return res.status(400).json({ error: 'Montant, description et date sont requis.' });
        }

        const expense = await prisma.expense.create({
            data: {
                amount: parseFloat(amount),
                description,
                date: new Date(date),
                invoiceNumber: invoiceNumber || null
            }
        });

        res.status(201).json(expense);
    } catch (error) {
        console.error('Erreur création dépense:', error);
        res.status(500).json({ error: 'Erreur lors de la création de la dépense' });
    }
});

router.delete('/expenses/:id', auth, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.expense.delete({
            where: { id }
        });
        res.json({ message: 'Dépense supprimée avec succès' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression de la dépense' });
    }
});

// ==========================================
// PLATFORM SETTINGS
// ==========================================

router.put('/settings/contact', auth, isAdmin, async (req, res) => {
    try {
        const { address, phone, email, whatsapp, aboutText } = req.body;
        
        const settings = await prisma.platformSettings.upsert({
            where: { id: "1" },
            update: { address, phone, email, whatsapp, aboutText },
            create: { id: "1", address, phone, email, whatsapp, aboutText }
        });

        res.json({ message: 'Paramètres mis à jour avec succès.', settings });
    } catch (error) {
        console.error('Erreur update settings:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres.' });
    }
});

// ==========================================
// B2B PARTNER GATEWAY (API KEYS)
// ==========================================

const crypto = require('crypto');

router.get('/b2b/partners', auth, isAdmin, async (req, res) => {
    try {
        const partners = await prisma.partnerBank.findMany({
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, contactEmail: true, isActive: true, createdAt: true }
        });
        res.json(partners);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des partenaires B2B' });
    }
});

router.post('/b2b/partners', auth, isAdmin, async (req, res) => {
    try {
        const { name, contactEmail } = req.body;
        if (!name) return res.status(400).json({ error: 'Le nom du partenaire est requis.' });

        // Generate a plain API key for the bank
        const plainApiKey = `fp_live_${crypto.randomBytes(24).toString('hex')}`;
        
        // Hash it for DB storage
        const apiKeyHash = crypto.createHash('sha256').update(plainApiKey).digest('hex');

        const partner = await prisma.partnerBank.create({
            data: { name, contactEmail, apiKeyHash }
        });

        res.status(201).json({ 
            message: 'Partenaire B2B créé avec succès!',
            partner: { id: partner.id, name: partner.name },
            apiKey: plainApiKey // Important: Only shown once!
        });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') return res.status(400).json({ error: 'Ce nom de partenaire existe déjà.' });
        res.status(500).json({ error: 'Erreur lors de la création du partenaire B2B' });
    }
});

router.delete('/b2b/partners/:id', auth, isAdmin, async (req, res) => {
    try {
        await prisma.partnerBank.delete({ where: { id: req.params.id } });
        res.json({ message: 'Partenaire B2B et ses clés API supprimés.' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// ==========================================
// SUPER ADMIN — ACCOUNT MANAGEMENT
// ==========================================

// Get own profile
router.get('/me', auth, isAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, firstName: true, lastName: true, phone: true, role: true, createdAt: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération du profil.' });
  }
});

// Update own profile (name, phone, password)
router.put('/me', auth, isAdmin, async (req, res) => {
  try {
    const { firstName, lastName, phone, password } = req.body;
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName)  updateData.lastName  = lastName;
    if (phone)     updateData.phone     = phone;
    if (password) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(password, 10);
    }
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      select: { id: true, firstName: true, lastName: true, phone: true, role: true }
    });
    res.json({ message: 'Profil mis à jour.', user: updated });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé.' });
    res.status(500).json({ error: 'Erreur mise à jour du profil.' });
  }
});

// List all admin accounts (SUPER_ADMIN only)
router.get('/accounts', auth, isSuperAdmin, async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true, firstName: true, lastName: true, phone: true, role: true, createdAt: true }
    });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération des comptes admin.' });
  }
});

// Create a new ADMIN account (SUPER_ADMIN only)
router.post('/accounts', auth, isSuperAdmin, async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { firstName, lastName, phone, password } = req.body;
    if (!firstName || !lastName || !phone || !password)
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    const hashed = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: { firstName, lastName, phone, password: hashed, role: 'ADMIN', isPhoneVerified: true, status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, phone: true, role: true, createdAt: true }
    });
    res.status(201).json({ message: 'Compte admin créé.', admin });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Ce numéro est déjà utilisé.' });
    res.status(500).json({ error: 'Erreur création du compte admin.' });
  }
});

// Delete an ADMIN account (SUPER_ADMIN only, cannot delete self)
router.delete('/accounts/:id', auth, isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.userId)
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role === 'SUPER_ADMIN')
      return res.status(400).json({ error: 'Action non autorisée.' });
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Compte admin supprimé.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur suppression du compte admin.' });
  }
});

// ==========================================
// SUPER ADMIN — AUDIT LOGS
// ==========================================

// GET all admin action logs
router.get('/logs', auth, isSuperAdmin, async (req, res) => {
  try {
    const logs = await prisma.adminActionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération des logs.' });
  }
});

// ==========================================
// SUPER ADMIN — USER ACCOUNT CONTROL
// ==========================================

// Block or Unblock a user
router.post('/users/:id/block', auth, isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    if (target.role === 'SUPER_ADMIN') return res.status(400).json({ error: 'Action non autorisée sur le Super Admin.' });

    const newStatus = target.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    const updated = await prisma.user.update({ where: { id }, data: { status: newStatus } });

    await logAction(req.user.userId, req.user.name || 'Super Admin', newStatus === 'BLOCKED' ? 'BLOCK_USER' : 'UNBLOCK_USER', 'USER', id, `${target.firstName} ${target.lastName}`);

    res.json({ message: `Utilisateur ${newStatus === 'BLOCKED' ? 'bloqué' : 'débloqué'}.`, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du blocage.' });
  }
});

// Permanently delete a user (SUPER_ADMIN only)
router.delete('/users/:id', auth, isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    if (['ADMIN', 'SUPER_ADMIN'].includes(target.role)) return res.status(400).json({ error: 'Utilisez la gestion des comptes admin pour supprimer un admin.' });

    await logAction(req.user.userId, req.user.name || 'Super Admin', 'DELETE_USER', 'USER', id, `${target.firstName} ${target.lastName}`);

    // Cascade delete related records
    const invoices = await prisma.invoice.findMany({ where: { userId: id }, include: { repaymentPlan: true } });
    for (const inv of invoices) {
      if (inv.repaymentPlan) {
        await prisma.payment.deleteMany({ where: { installment: { planId: inv.repaymentPlan.id } } });
        await prisma.installment.deleteMany({ where: { planId: inv.repaymentPlan.id } });
        await prisma.repaymentPlan.delete({ where: { id: inv.repaymentPlan.id } });
      }
    }
    await prisma.invoice.deleteMany({ where: { userId: id } });
    await prisma.kycVerification.deleteMany({ where: { userId: id } });
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ message: 'Utilisateur supprimé définitivement.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// ==========================================
// SUPER ADMIN — REPAYMENT OPTIONS
// ==========================================
router.get('/repayment-options', auth, isSuperAdmin, async (req, res) => {
  try {
    const options = await prisma.repaymentOption.findMany({
      orderBy: [
        { durationType: 'desc' },
        { duration: 'asc' }
      ]
    });
    res.json(options);
  } catch (err) {
    res.status(500).json({ error: 'Erreur récupération options de remboursement.' });
  }
});

router.post('/repayment-options', auth, isSuperAdmin, async (req, res) => {
  try {
    const { duration, durationType, feePercentage } = req.body;
    if (!duration || !durationType || feePercentage === undefined) {
      return res.status(400).json({ error: 'Durée, type et pourcentage sont requis.' });
    }
    const option = await prisma.repaymentOption.create({
      data: {
        duration: parseInt(duration),
        durationType,
        feePercentage: parseFloat(feePercentage)
      }
    });
    await logAction(req.user.userId, req.user.name || 'Super Admin', 'CREATE_REPAYMENT_OPTION', 'OPTION', option.id, `${duration} ${durationType} - ${feePercentage}%`);
    res.status(201).json({ message: 'Option créée.', option });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Une option avec cette durée exacte existe déjà.' });
    console.error(err);
    res.status(500).json({ error: 'Erreur création option.' });
  }
});

router.delete('/repayment-options/:id', auth, isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.repaymentOption.delete({ where: { id } });
    await logAction(req.user.userId, req.user.name || 'Super Admin', 'DELETE_REPAYMENT_OPTION', 'OPTION', id);
    res.json({ message: 'Option supprimée.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur suppression option.' });
  }
});

module.exports = router;
