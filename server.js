const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const listEndpoints = require('express-list-endpoints');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');
const cookieParser = require('cookie-parser');
const path = require('path');
const adminRoutes = require('./routes/admin.routes');

// Load environment variables
dotenv.config();
 
// Connect to database
connectDB();

const app = express();
app.set("trust proxy", 1); 
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-eval' 'unsafe-inline';");
  next();
});
const allowedOrigins = [
  'http://localhost:3000',                // Dev
  'https://final-sigma-swart.vercel.app' // Prod
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like Postman, mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }

    return callback(null, true);
  },
  credentials: true, // allow cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// =====================
// Routes
// =====================
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/admin', adminRoutes); // Important for KYC
app.use('/api/user/kyc', require('./routes/kyc.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/games', require('./routes/game.routes'));
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/matches', require('./routes/match.routes'));
app.use('/api/bonus', require('./routes/bonus.routes'));
app.use('/api/support', require('./routes/support.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/user/kyc', require('./routes/kyc.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/games/provider', require('./routes/gameProvider.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/promotions', require('./routes/promotion.routes'));
app.use('/api/messages', require('./routes/message.routes'));
app.use('/api/tournaments', require('./routes/tournament.routes'));
app.use('/api/stats', require('./routes/stats.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/bets', require('./routes/bet.routes'));
app.use('/api/bet-rounds', require('./routes/betRound.routes'));
app.use('/api/ibans', require('./routes/iban.routes'));
app.use('/api/public', require('./routes/public.routes')); // Public endpoints (no auth)
app.use('/api/content', require('./routes/content.routes'));
app.use('/api/rapidapi', require('./routes/rapidapi.routes'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Server is running!',
    status: 'OK',
    database: 'Connected',
    timestamp: new Date().toISOString()
  });
});

// =====================
// Swagger UI
// =====================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// =====================
// List all routes in console
// =====================
console.log('API Routes:');
console.log(listEndpoints(app));

// =====================
// Error handling middleware
// =====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
