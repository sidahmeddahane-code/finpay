/**
 * create-admin.js
 * Run with: node create-admin.js
 * Creates (or updates) an admin account in the FinPay database.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── CONFIGURE YOUR ADMIN CREDENTIALS HERE ───────────────────────────────────
const ADMIN_PHONE    = '00000000';      // Phone used to log in
const ADMIN_PASSWORD = 'Admin@1234';    // Password (change after first login!)
const ADMIN_FIRST    = 'Super';
const ADMIN_LAST     = 'Admin';
const ADMIN_ROLE     = 'SUPER_ADMIN';   // Only one super admin — YOU
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: {
      role: ADMIN_ROLE,
      isPhoneVerified: true,
      password: hashedPassword,
      status: 'ACTIVE',
    },
    create: {
      firstName: ADMIN_FIRST,
      lastName:  ADMIN_LAST,
      phone:     ADMIN_PHONE,
      password:  hashedPassword,
      role:      ADMIN_ROLE,
      isPhoneVerified: true,
      status:    'ACTIVE',
    },
  });

  console.log('✅ Admin account ready:');
  console.log(`   Phone   : ${admin.phone}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role    : ${admin.role}`);
  console.log(`   ID      : ${admin.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error creating admin:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
