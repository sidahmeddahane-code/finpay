const { execSync } = require('child_process');

console.log("=== RAILWAY STARTUP HOOK ===");

let dbUrl = process.env.DATABASE_URL || '';

// If the URL is empty but PostgreSQL variables from Railway exist, construct it!
if (!dbUrl && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGHOST && process.env.PGDATABASE) {
    dbUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`;
    console.log("Constructed DATABASE_URL from Railway Postgres variables.");
}

// 1. Clean up potential user mistakes from Railway UI
dbUrl = dbUrl.trim();

if (dbUrl.startsWith('DATABASE_URL=')) {
  dbUrl = dbUrl.replace('DATABASE_URL=', '');
}

if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
  dbUrl = dbUrl.slice(1, -1);
}

if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) {
  dbUrl = dbUrl.slice(1, -1);
}

// Set the securely cleaned variable back to the environment so Prisma uses it
process.env.DATABASE_URL = dbUrl;

console.log("URL Protocol check:", dbUrl.split('://')[0]);

try {
  console.log("Running prisma db push...");
  // stdio: 'inherit' prints the Prisma output directly to Railway logs
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log("✅ Database schema is pushed and ready!");
} catch (err) {
  console.error("❌ Prisma DB Push failed!");
  process.exit(1);
}
