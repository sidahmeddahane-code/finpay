const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const sendEmail = require('../utils/sendEmail');

const prisma = new PrismaClient();

// Soumettre documents KYC
router.post('/submit', auth, upload.fields([
  { name: 'idPhoto', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { idNumber } = req.body;

    if (!req.files || !req.files['idPhoto'] || !req.files['selfie']) {
      return res.status(400).json({ error: 'La photo d\'identité et le selfie sont requis.' });
    }

    const idPhotoUrl = req.files['idPhoto'][0].path; // Cloudinary URL
    const selfieUrl = req.files['selfie'][0].path;   // Cloudinary URL

    const existingKyc = await prisma.kycVerification.findUnique({
      where: { userId }
    });

    if (existingKyc) {
      if (existingKyc.status === 'APPROVED') {
        return res.status(400).json({ error: 'Votre KYC est déjà approuvé.' });
      }
      
      const kyc = await prisma.kycVerification.update({
        where: { userId },
        data: {
          idNumber,
          idPhotoUrl,
          selfieUrl,
          status: 'PENDING',
          submittedAt: new Date(),
          reviewedAt: null
        }
      });
      return res.json({ message: 'Documents KYC mis à jour avec succès', kyc });
    }

    const kyc = await prisma.kycVerification.create({
      data: {
        userId,
        idNumber,
        idPhotoUrl,
        selfieUrl
      }
    });

    res.status(201).json({ message: 'Documents KYC soumis avec succès', kyc });

    // Notify admin by email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    sendEmail({
      email: process.env.ADMIN_EMAIL,
      subject: `🇮🇩 Nouvelle Soumission KYC — ${user?.firstName} ${user?.lastName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px">
          <h2 style="color:#4361ee">🇮🇩 Nouvelle Vérification d'Identité (KYC)</h2>
          <p>Un citoyen a soumis ses documents KYC et attend votre validation.</p>
          <table style="width:100%;border-collapse:collapse;margin-top:15px">
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Nom Complet</td><td style="padding:8px">${user?.firstName} ${user?.lastName}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Téléphone</td><td style="padding:8px">${user?.phone}</td></tr>
            <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Numéro PIèCE</td><td style="padding:8px">${idNumber}</td></tr>
          </table>
          <p style="margin-top:20px"><a href="https://finpay.today/admin/kyc" style="background:#4361ee;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">→ Voir et Valider le KYC</a></p>
        </div>
      `
    }).catch(e => console.error('Email admin KYC error:', e));

  } catch (error) {
    console.error('Erreur soumission KYC:', error);
    res.status(500).json({ error: 'Erreur lors de la soumission KYC.' });
  }
});

// Récupérer le statut KYC de l'utilisateur connecté
router.get('/status', auth, async (req, res) => {
  try {
    const kyc = await prisma.kycVerification.findUnique({
      where: { userId: req.user.userId }
    });

    if (!kyc) {
      return res.json({ status: 'NOT_SUBMITTED' });
    }

    res.json(kyc);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du statut KYC.' });
  }
});

// Uploader les documents supplémentaires demandés par l'admin
router.post('/upload-extra-docs', auth, upload.fields([
  { name: 'workCert', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 },
  { name: 'otherDoc', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    let updateData = {
        status: 'PENDING',
        submittedAt: new Date(),
        reviewedAt: null
    };

    if (req.files && req.files['workCert']) {
        updateData.workCertUrl = req.files['workCert'][0].path;
    }
    if (req.files && req.files['addressProof']) {
        updateData.addressProofUrl = req.files['addressProof'][0].path;
    }
    if (req.files && req.files['otherDoc']) {
        updateData.otherDocUrl = req.files['otherDoc'][0].path;
    }

    const kyc = await prisma.kycVerification.update({
        where: { userId },
        data: updateData
    });

    res.json({ message: 'Documents supplémentaires soumis avec succès', kyc });
  } catch (error) {
    console.error('Erreur upload documents supplémentaires:', error);
    res.status(500).json({ error: 'Erreur lors de la soumission.' });
  }
});

module.exports = router;
