import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import authRouter from './routes/auth.js';
import statsRouter from './routes/stats.js';
import usersRouter from './routes/users.js';
import databaseRouter from './routes/database.js';
import crawlerRouter from './routes/crawler.js';
import candidatesRouter from './routes/candidates.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve static frontend files for standalone Admin Web UI
const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(process.cwd(), 'src/public');
app.use(express.static(publicDir));

// API Routes
app.use('/admin/api/auth', authRouter);
app.use('/admin/api/stats', statsRouter);
app.use('/admin/api/users', usersRouter);
app.use('/admin/api/database', databaseRouter);
app.use('/admin/api/crawler', crawlerRouter);
app.use('/admin/api/candidates', candidatesRouter);

// Fallback to Admin Single Page Dashboard
app.get('*', (req, res) => {
  if (req.path.startsWith('/admin/api')) {
    return res.status(404).json({ error: 'Endpoint da API Admin não encontrado.' });
  }
  return res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🛡️  CRITERIUM ADMIN SERVICE INICIADO NA PORTA ${PORT}`);
  console.log(`📊 Painel Web: http://localhost:${PORT}`);
  console.log(`🔒 Conectado diretamente ao banco de dados PostgreSQL`);
  console.log(`=======================================================`);
});
