const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const sendSms = require('../utils/sendSms');

const prisma = new PrismaClient();

// Fonction pour démarrer les tâches planifiées
const startCronJobs = () => {
  // S'exécute tous les jours à 08:00 du matin
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ [CRON] Exécution de la vérification des échéances...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const in3Days = new Date(today);
      in3Days.setDate(today.getDate() + 3);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Fonction d'aide pour formater la date
      const formatDate = (date) => date.toLocaleDateString('fr-FR');

      // Obtenir tous les versements (Installments) PENDING
      const pendingInstallments = await prisma.installment.findMany({
        where: { status: 'PENDING' },
        include: {
          plan: {
            include: {
              invoice: {
                include: { user: true }
              }
            }
          }
        }
      });

      for (const inst of pendingInstallments) {
        const dueDate = new Date(inst.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const user = inst.plan.invoice.user;
        const amountStr = inst.amount.toFixed(2);
        const providerName = inst.plan.invoice.provider;

        // Message à envoyer
        let message = null;
        let diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays === 3) {
          message = `Rappel FinPay: Votre échéance de ${amountStr} MRU pour ${providerName} arrive à terme dans 3 jours (${formatDate(dueDate)}). Veuillez préparer votre paiement.`;
        } else if (diffDays === 1) {
          message = `Urgent FinPay: Votre échéance de ${amountStr} MRU pour ${providerName} est DUE DEMAIN sans faute pour éviter des pénalités !`;
        } else if (diffDays === 0) {
          message = `Alerte FinPay: Votre paiement de ${amountStr} MRU pour ${providerName} est ATTENDU AUJOURD'HUI. Payez dès maintenant sur votre espace FinPay.`;
        } else if (diffDays === -1) {
          message = `⚠️ FinPay: RAPPEL DE RETARD ! Votre échéance de ${amountStr} MRU d'hier est impayée. Payez urgemment pour limiter l'accumulation des pénalités !`;
        }

        if (message) {
          // 1. Envoyer SMS (Uniquement si vérifié ou au moins si on a le tel)
          if (user.phone) {
            await sendSms({ phone: user.phone, message })
              .catch(e => console.error(`Erreur SMS Cron pour ${user.phone}:`, e));
          }

          // 2. Créer une notification In-App
          await prisma.notification.create({
            data: {
              userId: user.id,
              title: diffDays < 0 ? 'Retard de paiement' : 'Rappel d\'échéance',
              message: message
            }
          });
        }
      }
      console.log('✅ [CRON] Vérification des échéances terminée.');
    } catch (error) {
      console.error('❌ [CRON] Erreur lors de la vérification des échéances:', error);
    }
  });
  
  console.log('🕒 Cron jobs planifiés : Rappels de paiement ajoutés (08:00 AM quotidien).');
};

module.exports = startCronJobs;
