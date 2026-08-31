import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Tutorial Step 5 Visual Test] Testando e capturando Passo 5 do Tutorial (Desktop & Mobile)...');

  const frontendDir = '/home/henrik/workspace/Criterium/frontend';
  const screenshotsDir = '/home/henrik/workspace/Criterium/tests/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('  ├─ 🚀 Subindo servidor Vite preview em http://localhost:4173...');
  const serverProcess: ChildProcess = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    cwd: frontendDir,
    stdio: 'ignore',
  });

  await delay(2500);

  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless=new'],
    });

    // ----------------------------------------
    // 1. CAPTURA PASSO 5 - DESKTOP (1280 x 800)
    // ----------------------------------------
    console.log('  ├─ 📸 Testando fluxo completo do tutorial em Desktop (1280x800)...');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1280, height: 800 });
    await desktopPage.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

    // Ensure onboarding is NOT marked completed so welcome modal opens
    await desktopPage.evaluate(() => {
      localStorage.clear();
    });
    await desktopPage.reload({ waitUntil: 'networkidle0' });
    await delay(1000);

    // Click "Ver Tutorial" button on Welcome Modal
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const verTutorialBtn = btns.find(b => (b.textContent || '').includes('Ver Tutorial'));
      if (verTutorialBtn) (verTutorialBtn as HTMLElement).click();
    });
    await delay(800);

    // Navigate to Step 2 (Dossiê)
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const proxBtn = btns.find(b => (b.textContent || '').includes('Próximo'));
      if (proxBtn) (proxBtn as HTMLElement).click();
    });
    await delay(1200);

    // Navigate to Step 3 (Pontuação)
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const proxBtn = btns.find(b => (b.textContent || '').includes('Próximo'));
      if (proxBtn) (proxBtn as HTMLElement).click();
    });
    await delay(800);

    // Navigate to Step 4 (Configurações)
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const proxBtn = btns.find(b => (b.textContent || '').includes('Próximo'));
      if (proxBtn) (proxBtn as HTMLElement).click();
    });
    await delay(800);

    // Navigate to Step 5 (Minha Conta)
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const proxBtn = btns.find(b => (b.textContent || '').includes('Próximo'));
      if (proxBtn) (proxBtn as HTMLElement).click();
    });
    await delay(2000);

    const desktopPath = path.join(screenshotsDir, 'step5_tutorial_desktop.png');
    await desktopPage.screenshot({ path: desktopPath });
    console.log(`  │  └─ ✅ Captura do Passo 5 em Desktop salva em: ${desktopPath}`);

    // ----------------------------------------
    // 2. CAPTURA PASSO 5 - MOBILE (390 x 844)
    // ----------------------------------------
    console.log('  ├─ 📸 Testando fluxo completo do tutorial em Mobile (390x844)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

    await mobilePage.evaluate(() => {
      localStorage.clear();
    });
    await mobilePage.reload({ waitUntil: 'networkidle0' });
    await delay(1000);

    // Click "Ver Tutorial" button on Welcome Modal
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const verTutorialBtn = btns.find(b => (b.textContent || '').includes('Ver Tutorial'));
      if (verTutorialBtn) (verTutorialBtn as HTMLElement).click();
    });
    await delay(800);

    // Step 2
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const proxBtn = btns.find(b => (b.textContent || '').includes('Próximo'));
      if (proxBtn) (proxBtn as HTMLElement).click();
    });
    await delay(1200);

    // Step 3
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const proxBtn = btns.find(b => (b.textContent || '').includes('Próximo'));
      if (proxBtn) (proxBtn as HTMLElement).click();
    });
    await delay(800);

    // Step 4
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const proxBtn = btns.find(b => (b.textContent || '').includes('Próximo'));
      if (proxBtn) (proxBtn as HTMLElement).click();
    });
    await delay(800);

    // Step 5
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const proxBtn = btns.find(b => (b.textContent || '').includes('Próximo'));
      if (proxBtn) (proxBtn as HTMLElement).click();
    });
    await delay(2000);

    const mobilePath = path.join(screenshotsDir, 'step5_tutorial_mobile.png');
    await mobilePage.screenshot({ path: mobilePath });
    console.log(`  │  └─ ✅ Captura do Passo 5 em Mobile salva em: ${mobilePath}`);

    await browser.close();
    console.log('  └─ 🎉 Teste visual do Passo 5 concluído!');
  } catch (err: any) {
    console.error('❌ Erro durante o teste visual:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
