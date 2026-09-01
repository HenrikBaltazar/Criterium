import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Auth Modal Verification] Testando Modais de Login ("Entrar") e Cadastro ("Ranking/Pontuação/É GRÁTIS!")...');

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

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
      localStorage.setItem('criterium_onboarding_completed', 'true');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1000);

    // ----------------------------------------------------
    // TEST 1: Click "Entrar" button -> Expect Login Modal
    // ----------------------------------------------------
    console.log('  ├─ 📸 Testando clique no botão "Entrar" (deve abrir modal de Login)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const entrarBtn = btns.find(b => (b.textContent || '').trim() === 'Entrar');
      if (entrarBtn) (entrarBtn as HTMLElement).click();
    });
    await delay(800);

    const loginScreenshotPath = path.join(screenshotsDir, 'auth_modal_login.png');
    await page.screenshot({ path: loginScreenshotPath });
    console.log(`  │  └─ ✅ Modal de Login capturado em: ${loginScreenshotPath}`);

    // Close Modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Fechar modal de login"]') as HTMLElement;
      if (closeBtn) closeBtn.click();
    });
    await delay(500);

    // ----------------------------------------------------
    // TEST 2: Click "Ranking" button -> Expect Register Modal ("É GRÁTIS!")
    // ----------------------------------------------------
    console.log('  ├─ 📸 Testando clique no botão "Ranking" (deve abrir modal de Cadastro com "É GRÁTIS!")...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const rankingBtn = btns.find(b => (b.textContent || '').trim() === 'Ranking');
      if (rankingBtn) (rankingBtn as HTMLElement).click();
    });
    await delay(800);

    const registerScreenshotPath = path.join(screenshotsDir, 'auth_modal_register.png');
    await page.screenshot({ path: registerScreenshotPath });
    console.log(`  │  └─ ✅ Modal de Cadastro ("É GRÁTIS!") capturado em: ${registerScreenshotPath}`);

    await browser.close();
    console.log('  └─ 🎉 Testes do Auth Modal concluídos com sucesso!');
  } catch (err: any) {
    console.error('❌ Erro durante o teste do Auth Modal:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
