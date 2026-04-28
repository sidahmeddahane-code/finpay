const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { calculatePenalty } = require('../utils/penalty');
const sendSms = require('../utils/sendSms');
const sendEmail = require('../utils/sendEmail');

const prisma = new PrismaClient();

// Helper to notify admins in-app
const notifyAdmins = async (title, message) => {
  try {
    const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(a => ({ userId: a.id, title, message }))
      });
    }
  } catch (e) {
    console.error('Error notifying admins:', e);
  }
};

// Générer un OTP pour la soumission d'une facture
router.post('/send-submit-otp', auth, async (req, res) => {
  try {
    const { method } = req.body; // 'email' or 'sms'
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    if (method === 'email' && !user.email) {
      return res.status(400).json({ error: 'Aucune adresse email associée à ce compte.' });
    }
    if (method === 'sms' && !user.phone) {
      return res.status(400).json({ error: 'Aucun numéro de téléphone associé à ce compte.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60000);

    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiresAt }
    });

    if (method === 'email') {
      await sendEmail({
        email: user.email,
        subject: 'FinPay — Code de confirmation de facture',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #e0e0e0;border-radius:8px;text-align:center">
            <h2 style="color:#4361ee">FinPay</h2>
            <p>Code de confirmation pour soumettre votre facture :</p>
            <div style="font-size:2.5rem;font-weight:bold;letter-spacing:8px;color:#4361ee;margin:20px 0">${otpCode}</div>
            <p style="color:#888;font-size:0.9rem">Expire dans <strong>10 minutes</strong>.</p>
          </div>
        `
      });
    } else {
      await sendSms({
        phone: user.phone,
        message: `FinPay: Code de sécurité pour soumettre votre facture : ${otpCode}. Expire dans 10 min.`
      });
    }

    res.json({ message: `Code OTP envoyé par ${method === 'email' ? 'email' : 'SMS'}.` });
  } catch (error) {
    console.error('Erreur envoi OTP facture:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du code.' });
  }
});


// Soumettre une facture
router.post('/submit', auth, upload.single('invoiceDocument'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category, provider, invoiceNumber, amount, dueDate, otpCode, requestedDuration, requestedDurationType } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Le document de la facture (photo/pdf) est requis.' });
    }

    // Vérifier si l'utilisateur a un KYC approuvé
    const kyc = await prisma.kycVerification.findUnique({ where: { userId } });
    if (!kyc || kyc.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Vous devez avoir un KYC approuvé pour soumettre une facture.' });
    }

    // Vérifier l'OTP seulement si le compte n'a pas été vérifié lors de l'inscription
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user.isPhoneVerified) {
      if (!otpCode || user.otpCode !== otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        return res.status(400).json({ error: 'Code de sécurité invalide ou expiré.' });
      }
      
      // Effacer l'OTP après succès
      await prisma.user.update({
        where: { id: userId },
        data: { otpCode: null, otpExpiresAt: null }
      });
    }

    const documentUrl = req.file.path; // Cloudinary URL

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        category,
        provider,
        invoiceNumber,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        documentUrl,
        requestedDuration: requestedDuration ? parseInt(requestedDuration) : null,
        requestedDurationType: requestedDurationType || null
      }
    });

    // Notify admins via In-App Dashboard
    notifyAdmins('Nouvelle Facture', `Nouvelle demande de financement soumise par ${user.firstName} ${user.lastName} pour un montant de ${parseFloat(amount).toFixed(2)} MRU.`);

    res.status(201).json({ message: 'Facture soumise avec succès.', invoice });

    // Notify admin by email
    sendEmail({
      email: process.env.ADMIN_EMAIL,
      subject: `💸 Nouvelle Facture Soumise — ${provider}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px">
          <h2 style="color:#4361ee">💸 Nouvelle Demande de Financement</h2>
          <p>Un citoyen vient de soumettre une nouvelle facture nécessitant votre approbation.</p>
          <table style="width:100%;border-collapse:collapse;margin-top:15px">
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Citoyen</td><td style="padding:8px">${user.firstName} ${user.lastName} (${user.phone})</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Prestataire</td><td style="padding:8px">${provider}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">N° Facture</td><td style="padding:8px">${invoiceNumber}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Montant</td><td style="padding:8px;font-size:1.2em;color:#4361ee"><strong>${parseFloat(amount).toFixed(2)} MRU</strong></td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Catégorie</td><td style="padding:8px">${category}</td></tr>
          </table>
          <p style="margin-top:20px"><a href="https://finpay.today/admin/invoices" style="background:#4361ee;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">→ Voir et Approuver</a></p>
        </div>
      `
    }).catch(e => console.error('Email admin error:', e));

  } catch (error) {
    console.error('Erreur soumission facture:', error);
    res.status(500).json({ error: 'Erreur lors de la soumission de la facture.' });
  }
});

// Soumettre un document supplémentaire demandé par l'admin (INFO_REQUIRED)
router.post('/:invoiceId/submit-additional-doc', auth, upload.single('additionalDocument'), async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'Le document supplémentaire est requis.' });
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.userId !== userId) {
      return res.status(404).json({ error: 'Facture introuvable.' });
    }

    if (invoice.status !== 'INFO_REQUIRED') {
      return res.status(400).json({ error: 'Cette facture ne nécessite pas de documents supplémentaires.' });
    }

    const additionalDocUrl = req.file.path;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PENDING', additionalDocUrl } // Remet la facture en PENDING
    });

    res.json({ message: 'Document soumis avec succès.', invoice: updatedInvoice });
  } catch (error) {
    console.error('Erreur soumission doc additionnel:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
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
        },
        user: {
          include: {
            kyc: true
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
      orderBy: [
        { durationType: 'desc' },
        { duration: 'asc' }
      ]
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
      const { duration, durationType, commitmentSigned } = req.body; 
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
      const durationInt = parseInt(duration);
      const option = await prisma.repaymentOption.findFirst({
        where: { duration: durationInt, durationType }
      });
      if (!option || !option.isActive) {
          return res.status(400).json({ error: "L'option de remboursement sélectionnée n'est pas valide ou est inactive." });
      }
      const feePercentage = option.feePercentage;
      // Le montant total du plan correspond au montant de la facture (intérêts 0%), 
      // car la plateforme se rémunère uniquement avec les frais payés initialement.
      const totalAmount = invoice.amount;
      const installmentAmount = totalAmount / durationInt;
      const feeProofUrl = req.file.path; // Cloudinary URL

      // Créer le plan avec les nouveaux champs
      const plan = await prisma.repaymentPlan.create({
        data: {
          invoiceId: invoice.id,
          duration: durationInt,
          durationType,
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
      
      const installmentStep = Math.max(1, durationInt);
      // For MONTHS, 1 installment per month. For DAYS, 1 installment every (duration / steps) ?
      // Wait, if it's 15 days, is it 1 installment of 15 days? Yes, usually short term is single-pay or split.
      // We'll keep it simple: 1 single installment if durationType === 'DAYS' OR split normally.
      // Actually let's assume `installmentAmount` applies and we have `durationInt` installments? NO, if it's 15 DAYS it shouldn't be 15 installments of 1 day.
      // Usually, durationType = DAYS means the whole plan is due after X days.
      // Let's create ONLY 1 installment at the end of the DAYS. If MONTHS, we create N installments.
      if (durationType === 'DAYS') {
          currentDate.setDate(currentDate.getDate() + durationInt);
          installmentsData.push({
            planId: plan.id,
            amount: totalAmount,
            dueDate: new Date(currentDate)
          });
      } else {
          for (let i = 0; i < durationInt; i++) {
            currentDate.setMonth(currentDate.getMonth() + 1); // Mois suivant
            installmentsData.push({
              planId: plan.id,
              amount: installmentAmount,
              dueDate: new Date(currentDate) // Clone de la date
            });
          }
      }
  
      await prisma.installment.createMany({
        data: installmentsData
      });

      // Update invoice status to FEE_VERIFYING
      await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'FEE_VERIFYING' }
      });
  
      // Notify admins via In-App Dashboard
      notifyAdmins('Paiement des Frais', `Un citoyen a payé les frais pour la facture (Réf: ${invoice.invoiceNumber}). Veuillez vérifier la preuve.`);

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

        // Notify admins via In-App Dashboard
        notifyAdmins('Preuve de Paiement', `Une preuve de paiement a été soumise pour une échéance de la facture (Réf: ${installment.plan.invoice.invoiceNumber}). Veuillez vérifier.`);

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
