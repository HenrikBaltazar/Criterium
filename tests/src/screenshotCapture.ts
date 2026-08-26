import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const ARTIFACTS_DIR = '/home/henrik/.gemini/antigravity/brain/7fade8cb-e0d0-48a3-ae01-01f46042bbf3';
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'screenshots');

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function captureUIScreenshots(): Promise<{ name: string; path: string }[]> {
  console.log('📸 [UI Test Screenshots] Capturando evidências visuais Desktop & Mobile da interface...');

  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  // Start Vite Preview server for frontend
  const frontendDir = '/home/henrik/workspace/Criterium/frontend';
  console.log('  ├─ 🚀 Servidor Vite Preview ativado em http://localhost:4173...');
  
  const serverProcess: ChildProcess = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    cwd: frontendDir,
    stdio: 'ignore',
  });

  await delay(2500);

  const captured: { name: string; path: string }[] = [];

  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless=new'],
    });

    // ==========================================
    // 1. DESKTOP VIEWPORT CAPTURES (1280 x 900)
    // ==========================================
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1280, height: 900 });

    // Desktop 1: Dashboard
    console.log('  ├─ 📸 Capturando UI Desktop 1: Dashboard Principal por Cargo...');
    await desktopPage.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    await delay(1000);
    const rankingPath = path.join(SCREENSHOTS_DIR, 'screenshot_ranking_page.png');
    await desktopPage.screenshot({ path: rankingPath });
    captured.push({ name: 'Desktop: Dashboard Principal por Cargo', path: rankingPath });

    // Desktop 2: Ranking Drawer (Right Panel)
    console.log('  ├─ 📸 Capturando UI Desktop 2: Painel Drawer Flutuante à Direita (Ranking Técnico)...');
    const rankingBtn = await desktopPage.$('button[title="Abrir Painel do Ranking Técnico"]');
    if (rankingBtn) {
      await rankingBtn.click();
      await delay(600);
    }
    const drawerPath = path.join(SCREENSHOTS_DIR, 'screenshot_ranking_drawer.png');
    await desktopPage.screenshot({ path: drawerPath });
    captured.push({ name: 'Desktop: Painel Drawer Ranking Técnico por Cargo', path: drawerPath });

    // Close drawer
    const closeBtn = await desktopPage.$('button[title="Fechar"]');
    if (closeBtn) await closeBtn.click();
    await delay(400);

    // Desktop 3: Candidate Dossier Detail View
    console.log('  ├─ 📸 Capturando UI Desktop 3: Dossiê Factual do Candidato (Redes & Tooltips)...');
    const candidateCard = await desktopPage.$('.glass-card');
    if (candidateCard) {
      await candidateCard.click();
      await delay(1000);
    }
    const dossierPath = path.join(SCREENSHOTS_DIR, 'screenshot_candidate_dossier.png');
    await desktopPage.screenshot({ path: dossierPath });
    captured.push({ name: 'Desktop: Dossiê Factual do Candidato', path: dossierPath });

    // Desktop 4: Settings Page
    console.log('  ├─ 📸 Capturando UI Desktop 4: Configurações e Temas...');
    await desktopPage.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    await delay(500);
    const settingsBtn = await desktopPage.$('button[title="Configurações"]');
    if (settingsBtn) {
      await settingsBtn.click();
      await delay(600);
    }
    const settingsPath = path.join(SCREENSHOTS_DIR, 'screenshot_settings_page.png');
    await desktopPage.screenshot({ path: settingsPath });
    captured.push({ name: 'Desktop: Configurações e Temas', path: settingsPath });

    await desktopPage.close();

    // ==========================================
    // 2. MOBILE VIEWPORT CAPTURES (390 x 844)
    // ==========================================
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Mobile 1: Minimalist Toolbar + Bottom Nav Bar
    console.log('  ├─ 📸 Capturando UI Mobile 1: Toolbar Minimalista (Criterium + Localização + Lupa) & Bottom Nav...');
    await mobilePage.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    await delay(1000);
    const mobileDashboardPath = path.join(SCREENSHOTS_DIR, 'screenshot_mobile_dashboard.png');
    await mobilePage.screenshot({ path: mobileDashboardPath });
    captured.push({ name: 'Mobile: Toolbar Minimalista & Barra de Navegação Inferior', path: mobileDashboardPath });

    // Mobile 2: Full-Screen Search Modal with Blurred Background
    console.log('  ├─ 📸 Capturando UI Mobile 2: Componente de Busca em Tela Cheia com Blur...');
    const mobileSearchBtn = await mobilePage.$('button[title="Abrir Pesquisa em Tela Cheia"]');
    if (mobileSearchBtn) {
      await mobileSearchBtn.click();
      await delay(600);
    }
    const mobileSearchPath = path.join(SCREENSHOTS_DIR, 'screenshot_mobile_search_modal.png');
    await mobilePage.screenshot({ path: mobileSearchPath });
    captured.push({ name: 'Mobile: Busca em Tela Cheia com Fundo Desfocado (Blur)', path: mobileSearchPath });

    // Close Mobile Search Modal
    const closeSearchBtn = await mobilePage.$('button[title="Fechar Pesquisa"]');
    if (closeSearchBtn) await closeSearchBtn.click();
    await delay(400);

    // Mobile 3: Ranking Drawer on Mobile
    console.log('  ├─ 📸 Capturando UI Mobile 3: Painel Ranking Técnico no Mobile...');
    const mobileRankingNavBtn = await mobilePage.$('nav button:nth-child(2)');
    if (mobileRankingNavBtn) {
      await mobileRankingNavBtn.click();
      await delay(600);
    }
    const mobileDrawerPath = path.join(SCREENSHOTS_DIR, 'screenshot_mobile_ranking_drawer.png');
    await mobilePage.screenshot({ path: mobileDrawerPath });
    captured.push({ name: 'Mobile: Painel Drawer do Ranking Técnico', path: mobileDrawerPath });

    await mobilePage.close();
    await browser.close();

    console.log('  └─ ✅ Captura de 7 evidências visuais de UI (Desktop & Mobile) concluída com sucesso!');
  } catch (err: any) {
    console.error('❌ Erro na captura de screenshots:', err.message);
  } finally {
    serverProcess.kill();
  }

  return captured;
}
