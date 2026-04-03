const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetData() {
  console.log("⚠️ ATTENTION : Début de la suppression des données...");
  
  try {
    // Étape 1 : Récupérer tous les utilisateurs à supprimer (tous sauf le SUPER_ADMIN)
    const usersToDelete = await prisma.user.findMany({
      where: {
        role: {
          not: 'SUPER_ADMIN'
        }
      },
      select: { id: true }
    });

    const userIds = usersToDelete.map(u => u.id);

    if (userIds.length === 0) {
      console.log("✅ Aucun utilisateur (autre que SUPER_ADMIN) à supprimer. La base est déjà propre !");
      process.exit(0);
    }

    console.log(`🧹 ${userIds.length} utilisateur(s) trouvé(s). Suppression de leurs données associées...`);

    // Récupérer toutes les factures liées à ces utilisateurs
    const invoicesToDelete = await prisma.invoice.findMany({
      where: { userId: { in: userIds } },
      select: { id: true }
    });
    const invoiceIds = invoicesToDelete.map(i => i.id);

    // Récupérer tous les plans liés à ces factures
    const plansToDelete = await prisma.repaymentPlan.findMany({
      where: { invoiceId: { in: invoiceIds } },
      select: { id: true }
    });
    const planIds = plansToDelete.map(p => p.id);

    // Récupérer toutes les échéances liées à ces plans
    const installmentsToDelete = await prisma.installment.findMany({
      where: { planId: { in: planIds } },
      select: { id: true }
    });
    const installmentIds = installmentsToDelete.map(i => i.id);

    // Étape 2 : Supprimer dans l'ordre (contraintes de clés étrangères)
    // 2.1 - Paiements
    const delPayments = await prisma.payment.deleteMany({
      where: { installmentId: { in: installmentIds } }
    });
    console.log(`- ${delPayments.count} paiements supprimés`);

    // 2.2 - Échéances
    const delInstallments = await prisma.installment.deleteMany({
      where: { planId: { in: planIds } }
    });
    console.log(`- ${delInstallments.count} échéances supprimées`);

    // 2.3 - Plans d'échelonnement
    const delPlans = await prisma.repaymentPlan.deleteMany({
      where: { invoiceId: { in: invoiceIds } }
    });
    console.log(`- ${delPlans.count} plans d'échelonnement supprimés`);

    // 2.4 - Factures
    const delInvoices = await prisma.invoice.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`- ${delInvoices.count} factures supprimées`);

    // 2.5 - Vérifications KYC
    const delKyc = await prisma.kycVerification.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`- ${delKyc.count} dossiers KYC supprimés`);

    // 2.6 - Notifications
    const delNotifs = await prisma.notification.deleteMany({
      where: { userId: { in: userIds } }
    });
    console.log(`- ${delNotifs.count} notifications supprimées`);

    // 2.7 - Historique des actions administrateurs (Pour démarrer sur de bonnes bases)
    const delLogs = await prisma.adminActionLog.deleteMany({});
    console.log(`- ${delLogs.count} logs administrateurs supprimés`);

    // Étape 3 : Supprimer les Utilisateurs finaux
    const delUsers = await prisma.user.deleteMany({
      where: {
        role: {
          not: 'SUPER_ADMIN'
        }
      }
    });
    console.log(`- ${delUsers.count} compte(s) utilisateur(s) supprimé(s)`);

    console.log("\n🚀 SUCCÈS : Réinitialisation terminée ! Prêt pour le lancement officiel !");

  } catch (error) {
    console.error("❌ Erreur pendant la réinitialisation :", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetData();
