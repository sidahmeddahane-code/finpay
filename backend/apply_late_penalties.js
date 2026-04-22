const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyPenalties() {
  console.log('🔄 Application immédiate des pénalités pour les utilisateurs en retard...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all pending and late installments
    const installments = await prisma.installment.findMany({
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

    let modifiedCount = 0;

    for (const inst of installments) {
      const dueDate = new Date(inst.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        console.log(`⚠️ Utilisateur ${inst.plan.invoice.user.email || inst.plan.invoice.user.phone} est en retard de ${Math.abs(diffDays)} jours.`);
        
        // Mark as LATE
        await prisma.installment.update({
          where: { id: inst.id },
          data: { status: 'LATE' }
        });

        // Decrement credit score
        await prisma.user.update({
          where: { id: inst.plan.invoice.user.id },
          data: { creditScore: { decrement: 10 } }
        });

        modifiedCount++;
      }
    }

    console.log(`✅ Terminé ! ${modifiedCount} échéances ont été passées en retard et les scores ont été ajustés.`);
  } catch (err) {
    console.error('❌ Erreur:', err);
  } finally {
    await prisma.$disconnect();
  }
}

applyPenalties();
