require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require("dotenv").config()
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const categoriesRoutes = require('./routes/categories');
const wishlistRoutes = require('./routes/wishlist');
const reviewsRoutes = require('./routes/reviews');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS: allow local dev origins and optional CLIENT_URL from env
const allowed = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  "http://localhost:8080",
  "https://ff8d2ba85401451bad453bb609262d07-vortex-hub.projects.builder.my"
];
if (process.env.CLIENT_URL) allowed.push(process.env.CLIENT_URL);

app.use((req, res, next) => {
  console.log(req.method, req.path);
  next();
});

app.use(cors({ origin: allowed, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// health check
app.get('/api/health', (req, res) => res.json({ ok: true, message: 'API running' }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/settings', settingsRoutes);

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { dbName: 'UNI10' });
    console.log('Connected to MongoDB (UNI10)');

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
}

start();
