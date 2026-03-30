const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

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
