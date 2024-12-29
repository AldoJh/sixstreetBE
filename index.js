import Express from 'express';
import db from './config/database.js';
import router from './routes/index.js';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { sendEmailReminder } from './controller/user.js';

dotenv.config();
const app = Express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cron.schedule('0 0 7 * * *', sendEmailReminder); 

app.use('/upload', Express.static(path.join(__dirname, 'upload')));

// Middleware manual untuk menangani CORS
app.use((req, res, next) => {
  const allowedOrigins = ['https://six6street.co.id', 'https://sixstreet.vercel.app', 'http://localhost:5173'];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Koneksi dan sinkronisasi basis data
(async () => {
  try {
    await db.authenticate();
    console.log('Connection to the database has been established successfully.');

    // Sync semua model
    await db.sync();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
})();

// Middleware
app.use(cookieParser());
app.use(Express.json());

// Gunakan router
app.use(router);

// Menjalankan server
const server = app.listen(3000, () => {
  const port = server.address().port;
  console.log(`Server is running on http://localhost:${port}`);
});
