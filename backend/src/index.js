const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

const authRoutes    = require('./routes/auth');
const kycRoutes     = require('./routes/kyc');
const invoiceRoutes = require('./routes/invoices');
const adminRoutes   = require('./routes/admin');
const b2bRoutes     = require('./routes/b2b');

const app  = express();
const PORT = process.env.PORT || 5000;

// 1. Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
      mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
    },
  },
}));

// Trust Nginx proxy (required for express-rate-limit behind Nginx)
app.set('trust proxy', 1);

// 2. Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: 'Trop de requêtes depuis cette adresse IP, veuillez réessayer dans 15 minutes.' }
});
app.use('/api', apiLimiter);

// 3. Parameter pollution
app.use(hpp());

// 4. CORS — allow localhost in dev and finpay.today in production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://finpay.today',
  'https://www.finpay.today',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// 5. Body parser
app.use(express.json());

// 6. API Routes
app.use('/api/auth',     authRoutes);
app.use('/api/kyc',      kycRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/b2b',      b2bRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// 7. Serve built React frontend (production)
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Global JSON error handler (catches Multer errors and all other middleware errors)
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.message || err);
  const status = err.status || err.statusCode || 500;
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Fichier trop volumineux. Maximum autorisé: 50 MB.' });
  }
  res.status(status).json({ error: err.message || 'Une erreur interne est survenue.' });
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
