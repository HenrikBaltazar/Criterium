import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import electionRoutes from './routes/elections.routes';
import candidateRoutes from './routes/candidates.routes';
import settingRoutes from './routes/settings.routes';
import evaluationRoutes from './routes/evaluations.routes';
import rankingRoutes from './routes/rankings.routes';
import crawlerRoutes from './routes/crawler.routes';
import annotationRoutes from './routes/annotations.routes';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4000;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // Configurable via ENV for production
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// Auth Rate Limiting (Brute-force protection for login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de autenticação. Por favor, tente novamente em alguns minutos.' },
});

// General API Rate Limiting (Skip GET requests so UI browsing never faces 429)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', system: 'Criterium API', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/annotations', annotationRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Criterium Backend Server rodando na porta ${PORT}`);
});

export default app;
