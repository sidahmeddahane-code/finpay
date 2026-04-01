const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { calculatePenalty } = require('../utils/penalty');
const sendSms = require('../utils/sendSms');

const prisma = new PrismaClient();

// Générer un OTP pour la soumission d'une facture
router.post('/send-submit-otp', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiresAt }
    });

    await sendSms({
      phone: user.phone,
      message: `FinPay: Code de sécurité pour soumettre votre facture : ${otpCode}. Expire dans 10 min.`
    });

    res.json({ message: 'Code OTP envoyé par SMS.' });
  } catch (error) {
    console.error('Erreur envoi OTP facture:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du code.' });
  }
});

// Soumettre une facture
router.post('/submit', auth, upload.single('invoiceDocument'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category, provider, invoiceNumber, amount, dueDate, otpCode } = req.body;

    if (!otpCode) {
      return res.status(400).json({ error: 'Le code de vérification SMS est requis.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Le document de la facture (photo/pdf) est requis.' });
    }

    // Vérifier si l'utilisateur a un KYC approuvé
    const kyc = await prisma.kycVerification.findUnique({ where: { userId } });
    if (!kyc || kyc.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Vous devez avoir un KYC approuvé pour soumettre une facture.' });
    }

    // Vérifier l'OTP
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user.otpCode !== otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Code de sécurité invalide ou expiré.' });
    }

    // Effacer l'OTP après succès
    await prisma.user.update({
      where: { id: userId },
      data: { otpCode: null, otpExpiresAt: null }
    });

    const documentUrl = req.file.path; // Cloudinary URL

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        category,
        provider,
        invoiceNumber,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        documentUrl
      }
    });

    res.status(201).json({ message: 'Facture soumise avec succès.', invoice });
  } catch (error) {
    console.error('Erreur soumission facture:', error);
    res.status(500).json({ error: 'Erreur lors de la soumission de la facture.' });
  }
});

// Récupérer les factures de l'utilisateur
router.get('/my-invoices', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const invoices = await prisma.invoice.findMany({
      where: { userId },
      include: {
        repaymentPlan: {
          include: {
            installments: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
    
    // Calculate dynamic penalties before sending to client
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
    res.status(500).json({ error: 'Erreur lors de la récupération des factures.' });
  }
});

// Récupérer les options de remboursement actives
router.get('/repayment-options', auth, async (req, res) => {
  try {
    const options = await prisma.repaymentOption.findMany({
      where: { isActive: true },
      orderBy: { durationMonths: 'asc' }
    });
    res.json(options);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des options de remboursement.' });
  }
});

// Accepter un plan de remboursement (Soumission des frais et engagement)
router.post('/:invoiceId/accept-plan', auth, upload.single('feeProof'), async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const { durationMonths, commitmentSigned } = req.body; // ex: 2, 4, 6
      const userId = req.user.userId;
  
      if (!req.file) {
          return res.status(400).json({ error: 'La preuve de paiement des frais est requise.' });
      }

      if (commitmentSigned !== 'true' && commitmentSigned !== true) {
          return res.status(400).json({ error: "L'engagement de remboursement doit être signé/coché." });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId }
      });
  
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Facture non trouvée.' });
      }
  
      if (invoice.status !== 'APPROVED') {
          return res.status(400).json({ error: 'La facture n\'est pas éligible pour un plan d\'échelonnement ou est déjà en cours de traitement.' });
      }
  
      // Validation de la durée et calcul des frais via RepaymentOption
      const option = await prisma.repaymentOption.findUnique({
        where: { durationMonths: parseInt(durationMonths) }
      });
      if (!option || !option.isActive) {
          return res.status(400).json({ error: "L'option de remboursement sélectionnée n'est pas valide ou est inactive." });
      }
      const feePercentage = option.feePercentage;
      // Le montant total du plan correspond au montant de la facture (intérêts 0%), 
      // car la plateforme se rémunère uniquement avec les frais payés initialement.
      const totalAmount = invoice.amount;
      const installmentAmount = totalAmount / durationMonths;
      const feeProofUrl = req.file.path; // Cloudinary URL

      // Créer le plan avec les nouveaux champs
      const plan = await prisma.repaymentPlan.create({
        data: {
          invoiceId: invoice.id,
          durationMonths: parseInt(durationMonths),
          totalAmount,
          feePercentage,
          feeProofUrl,
          commitmentSigned: true,
          status: 'FEE_VERIFYING'
        }
      });
  
      // Créer les échéances (installments)
      const installmentsData = [];
      let currentDate = new Date();
      currentDate.setMonth(currentDate.getMonth() + 1); // 1ère échéance dans 1 mois
  
      for (let i = 0; i < durationMonths; i++) {
        installmentsData.push({
          planId: plan.id,
          amount: installmentAmount,
          dueDate: new Date(currentDate) // Clone de la date
        });
        currentDate.setMonth(currentDate.getMonth() + 1); // Mois suivant
      }
  
      await prisma.installment.createMany({
        data: installmentsData
      });

      // Update invoice status to FEE_VERIFYING
      await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'FEE_VERIFYING' }
      });
  
      res.json({ message: 'Plan soumis avec succès. En attente de validation des frais par l\'administration.', plan });
    } catch (error) {
      console.error('Erreur création plan:', error);
      res.status(500).json({ error: 'Erreur lors de la création du plan.' });
    }
});

// Obtenir les méthodes de paiement actives
router.get('/payment-methods', auth, async (req, res) => {
    try {
        const methods = await prisma.paymentMethod.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(methods);
    } catch (error) {
        res.status(500).json({ error: 'Erreur récupération méthodes de paiement.' });
    }
});

// Soumettre une preuve de paiement pour une échéance
router.post('/pay-installment/:installmentId', auth, upload.single('paymentProof'), async (req, res) => {
    try {
        const { installmentId } = req.params;
        const { method } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'La preuve de paiement (reçu/capture) est requise.' });
        }

        const installment = await prisma.installment.findUnique({
            where: { id: installmentId },
            include: { plan: { include: { invoice: true } } }
        });

        if (!installment || installment.plan.invoice.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Échéance introuvable.' });
        }

        if (installment.status === 'PAID' || installment.status === 'VERIFYING') {
            return res.status(400).json({ error: 'Cette échéance est déjà payée ou en cours de vérification.' });
        }

        const proofUrl = req.file.path; // Cloudinary URL

        // Calcul de la pénalité au moment exact du paiement
        const penalty = calculatePenalty(installment, installment.plan.invoice.amount);
        const totalAmountDue = installment.amount + penalty;

        // Enregistrer la soumission
        await prisma.payment.create({
            data: {
                installmentId,
                amount: totalAmountDue,
                method: method || 'Non spécifié',
                proofUrl,
                status: 'PENDING'
            }
        });

        // Mettre à jour l'échéance à l'état de vérification ET enregistrer la pénalité appliquée
        await prisma.installment.update({
            where: { id: installmentId },
            data: { 
                status: 'VERIFYING',
                penaltyApplied: penalty 
            } 
        });

        res.json({ message: 'Preuve soumise avec succès. En attente de validation.' });

    } catch (error) {
        console.error('Erreur paiement:', error);
        res.status(500).json({ error: 'Erreur lors de la soumission de la preuve.' });
    }
});

// Obtenir toutes les échéances (Dashboard user)
router.get('/my-installments', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const installments = await prisma.installment.findMany({
            where: { plan: { invoice: { userId } } },
            include: { plan: { include: { invoice: true } } },
            orderBy: { dueDate: 'asc' }
        });
        
        const installmentsWithPenalties = installments.map(inst => ({
            ...inst,
            dynamicPenalty: calculatePenalty(inst, inst.plan.invoice.amount)
        }));

        res.json(installmentsWithPenalties);
    } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des échéances.' });
    }
});

module.exports = router;
