const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAll() {
  try {
    const result = await prisma.user.updateMany({
      data: { isPhoneVerified: true }
    });
    console.log(`Migration réussie ! ${result.count} utilisateurs existants ont été vérifiés automatiquement.`);
  } catch (error) {
    console.error("Erreur de migration:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAll();
