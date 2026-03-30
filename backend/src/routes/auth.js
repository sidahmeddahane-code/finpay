const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const sendSms = require('../utils/sendSms');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Inscription
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, phone, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { phone }
    });

    if (existingUser) {
      if (existingUser.isPhoneVerified) {
        return res.status(400).json({ error: 'Un utilisateur avec ce téléphone existe déjà.' });
      } else {
        // Optionnel : Générer un nouveau code si l'utilisateur essaie de s'inscrire à nouveau (non vérifié)
        // Pour simplifier, on permet juste de renvoyer l'OTP si besoin dans un futur endpoint.
        return res.status(400).json({ error: 'Compte déjà créé mais non vérifié. Veuillez valider votre code OTP.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Générer un code OTP à 6 chiffres
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60000); // Expiration 10 mins

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        password: hashedPassword,
        otpCode,
        otpExpiresAt,
        isPhoneVerified: false
      }
    });

    // Envoi du SMS de vérification
    await sendSms({
        phone: user.phone,
        message: `FinPay: Votre code de vérification est ${otpCode}. Expire dans 10 minutes.`
    });

    res.status(201).json({ message: 'Compte pré-créé. Un SMS contenant votre code OTP a été envoyé.', phone: user.phone });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription.' });
  }
});

// Vérification de l'OTP d'inscription
router.post('/verify-registration-otp', async (req, res) => {
  try {
    const { phone, otpCode } = req.body;
    
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    if (user.isPhoneVerified) return res.status(400).json({ error: 'Compte déjà vérifié.' });
    
    if (user.otpCode !== otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
       return res.status(400).json({ error: 'Code incorrect ou expiré.' });
    }

    // Valider le profil
    await prisma.user.update({
       where: { phone },
       data: { isPhoneVerified: true, otpCode: null, otpExpiresAt: null }
    });

    res.json({ message: 'Compte vérifié avec succès. Vous pouvez maintenant vous connecter !' });
  } catch (error) {
    console.error('Erreur vérification OTP:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body; 

    const user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    if (!user.isPhoneVerified) {
      return res.status(403).json({ error: 'Veuillez vérifier votre numéro de téléphone avant de vous connecter.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Compte inactif ou suspendu.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

// Get platform contact settings (Public)
router.get('/settings/contact', async (req, res) => {
  try {
    const settings = await prisma.platformSettings.findUnique({ where: { id: "1" } });
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération des paramètres.' });
  }
});

module.exports = router;
