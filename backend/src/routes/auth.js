const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const sendSms = require('../utils/sendSms');
const sendEmail = require('../utils/sendEmail');
const { auth } = require('../middleware/auth');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Helper: generate OTP and send via email or SMS
const sendOtp = async (user, method) => {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60000);

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode, otpExpiresAt }
  });

  if (method === 'email' && user.email) {
    await sendEmail({
      email: user.email,
      subject: 'FinPay — Votre code de vérification',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #e0e0e0;border-radius:8px;text-align:center">
          <h2 style="color:#4361ee">FinPay</h2>
          <p>Votre code de vérification est :</p>
          <div style="font-size:2.5rem;font-weight:bold;letter-spacing:8px;color:#4361ee;margin:20px 0">${otpCode}</div>
          <p style="color:#888;font-size:0.9rem">Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.</p>
        </div>
      `
    });
  } else if (method === 'sms' && user.phone) {
    await sendSms({
      phone: user.phone,
      message: `FinPay: Votre code de vérification est ${otpCode}. Expire dans 10 minutes.`
    });
  }

  return otpCode;
};

// =====================
// REGISTRATION
// =====================
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;

    if (!phone && !email) {
      return res.status(400).json({ error: 'Un numéro de téléphone ou une adresse email est requis.' });
    }

    // Check if user already exists
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        if (existingPhone.isPhoneVerified) {
          return res.status(400).json({ error: 'Un compte avec ce numéro de téléphone existe déjà.' });
        }
        return res.status(400).json({ error: 'Compte déjà créé mais non vérifié. Veuillez valider votre code OTP.' });
      }
    }
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        if (existingEmail.isPhoneVerified) {
          return res.status(400).json({ error: 'Un compte avec cette adresse email existe déjà.' });
        }
        return res.status(400).json({ error: 'Compte déjà créé mais non vérifié. Veuillez valider votre code OTP.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const method = phone ? 'sms' : 'email';

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone: phone || null,
        email: email ? email.toLowerCase() : null,
        password: hashedPassword,
        isPhoneVerified: false
      }
    });

    await sendOtp(user, method);

    res.status(201).json({
      message: method === 'sms'
        ? 'Compte créé. Un SMS contenant votre code OTP a été envoyé.'
        : 'Compte créé. Un email contenant votre code OTP a été envoyé.',
      phone: phone || null,
      email: email || null,
      method
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription.' });
  }
});

// =====================
// VERIFY REGISTRATION OTP
// =====================
router.post('/verify-registration-otp', async (req, res) => {
  try {
    const { phone, email, otpCode } = req.body;

    let user = null;
    if (phone) user = await prisma.user.findUnique({ where: { phone } });
    else if (email) user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    if (user.isPhoneVerified) return res.status(400).json({ error: 'Compte déjà vérifié.' });

    if (user.otpCode !== otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Code incorrect ou expiré.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true, otpCode: null, otpExpiresAt: null }
    });

    res.json({ message: 'Compte vérifié avec succès. Vous pouvez maintenant vous connecter !' });
  } catch (error) {
    console.error('Erreur vérification OTP:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// =====================
// LOGIN
// =====================
router.post('/login', async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    if (!phone && !email) {
      return res.status(400).json({ error: 'Un numéro de téléphone ou une adresse email est requis.' });
    }

    let user = null;
    if (phone) user = await prisma.user.findUnique({ where: { phone } });
    else if (email) user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) return res.status(401).json({ error: 'Identifiants incorrects.' });

    if (!user.isPhoneVerified) {
      return res.status(403).json({ error: 'Veuillez vérifier votre compte avant de vous connecter.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Compte inactif ou suspendu.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(401).json({ error: 'Identifiants incorrects.' });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' } // Extended to 30 days so users aren't constantly asked for OTP
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
        phone: user.phone,
        status: user.status,
        isPhoneVerified: user.isPhoneVerified
      }
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

// =====================
// ADD PHONE NUMBER (for email-only users)
// =====================
router.post('/add-phone', auth, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Numéro de téléphone requis.' });

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing && existing.id !== req.user.userId) {
      return res.status(400).json({ error: 'Ce numéro est déjà utilisé par un autre compte.' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { phone }
    });

    await sendOtp(user, 'sms');

    res.json({ message: 'Code OTP envoyé par SMS pour vérifier votre numéro.' });
  } catch (error) {
    console.error('Erreur add-phone:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du numéro.' });
  }
});

// =====================
// VERIFY PHONE OTP (payment gate)
// =====================
router.post('/verify-phone-otp', auth, async (req, res) => {
  try {
    const { otpCode } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    if (user.otpCode !== otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Code incorrect ou expiré.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true, otpCode: null, otpExpiresAt: null }
    });

    res.json({ message: 'Numéro de téléphone vérifié avec succès!' });
  } catch (error) {
    console.error('Erreur verify-phone-otp:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// =====================
// GET USER PROFILE
// =====================
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, firstName: true, lastName: true,
        phone: true, email: true, isPhoneVerified: true,
        address: true, employment: true,
        creditScore: true, status: true, createdAt: true,
        kyc: { select: { status: true } },
        _count: { select: { invoices: true } }
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération du profil.' });
  }
});

// =====================
// UPDATE USER PROFILE
// =====================
router.put('/profile', auth, async (req, res) => {
  try {
    const { address, employment } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        address,
        employment
      },
      select: {
        id: true, firstName: true, lastName: true,
        phone: true, email: true, isPhoneVerified: true,
        address: true, employment: true,
        creditScore: true, status: true
      }
    });
    
    res.json({ message: 'Profil mis à jour avec succès.', user: updatedUser });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil.' });
  }
});

// =====================
// PUBLIC: Platform Contact Settings
// =====================
router.get('/settings/contact', async (req, res) => {
  try {
    const settings = await prisma.platformSettings.findUnique({ where: { id: "1" } });
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: 'Erreur récupération des paramètres.' });
  }
});

// =====================
// FORGOT PASSWORD (Send OTP)
// =====================
router.post('/forgot-password', async (req, res) => {
  try {
    const { phone, email } = req.body;
    if (!phone && !email) return res.status(400).json({ error: 'Un numéro de téléphone ou email est requis.' });

    let user = null;
    if (phone) user = await prisma.user.findUnique({ where: { phone } });
    else if (email) user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) return res.status(404).json({ error: 'Aucun compte trouvé avec ces informations.' });

    const method = phone ? 'sms' : 'email';
    await sendOtp(user, method);

    res.json({ message: 'Code de réinitialisation envoyé.' });
  } catch (error) {
    console.error('Erreur forgot-password:', error);
    res.status(500).json({ error: 'Erreur lors de la demande.' });
  }
});

// =====================
// RESET PASSWORD (Verify & Update)
// =====================
router.post('/reset-password', async (req, res) => {
  try {
    const { phone, email, otpCode, newPassword } = req.body;
    let user = null;

    if (phone) user = await prisma.user.findUnique({ where: { phone } });
    else if (email) user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    if (user.otpCode !== otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Code incorrect ou expiré.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, otpCode: null, otpExpiresAt: null }
    });

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error('Erreur reset-password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation.' });
  }
});

module.exports = router;
