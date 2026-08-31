import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getRealAuthData(): Promise<{ user: any; token: string } | null> {
  const email = 'eleitor.preview@criterium.app';
  const password = 'SenhaSegura123!';
  const name = 'Eleitor Visitante';

  try {
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      return { user: data.user, token: data.token };
    }
  } catch (e) {}

  try {
    const regRes = await fetch('http://localhost:4000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (regRes.ok) {
      const data = await regRes.json();
      return { user: data.user, token: data.token };
    }
  } catch (e) {}

  return null;
}

async function main() {
  console.log('📸 [Account Screenshots Automation] Obotendo autenticação do backend na porta 4000...');

  const authData = await getRealAuthData();
  if (!authData) {
    console.error('❌ Erro: Não foi possível obter autenticação válida do backend.');
    process.exit(1);
  }
  console.log(`  ✅ Autenticado como: ${authData.user.name} (${authData.user.email})`);

  const frontendDir = '/home/henrik/workspace/Criterium/frontend';
  const assetsDir = path.join(frontendDir, 'src', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
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
    // 1. CAPTURA DESKTOP (1280 x 800)
    // ----------------------------------------
    console.log('  ├─ 📸 Capturando Tela de Conta em formato Desktop (1280x800)...');
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport({ width: 1280, height: 800 });
    await desktopPage.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

    // Inject valid user state and JWT token in localStorage
    await desktopPage.evaluate((userObj, tokenStr) => {
      localStorage.setItem('criterium_user', JSON.stringify(userObj));
      localStorage.setItem('criterium_token', tokenStr);
      localStorage.setItem('criterium_onboarding_completed', 'true');
      localStorage.setItem('criterium_pwa_modal_dismissed', 'true');
    }, authData.user, authData.token);

    await desktopPage.reload({ waitUntil: 'networkidle0' });
    await delay(1500);

    // Wait until header shows logged in user
    await desktopPage.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => (b.textContent || '').includes('Eleitor'));
    }, { timeout: 5000 });

    // Open User Dropdown menu in Header
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const userBtn = btns.find(b =>
        (b.textContent || '').includes('Eleitor') || (b.getAttribute('title') || '').includes('Menu de Conta')
      );
      if (userBtn) (userBtn as HTMLElement).click();
    });
    await delay(800);

    // Click "Minha Conta" inside dropdown
    await desktopPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const accountBtn = btns.find(b => (b.textContent || '').includes('Minha Conta'));
      if (accountBtn) (accountBtn as HTMLElement).click();
    });
    await delay(2500);

    const desktopPath = path.join(assetsDir, 'account_preview_desktop.png');
    await desktopPage.screenshot({ path: desktopPath });
    console.log(`  │  └─ ✅ Captura Desktop salva com sucesso em: ${desktopPath}`);

    // ----------------------------------------
    // 2. CAPTURA MOBILE (390 x 844 - iPhone 12/13/14)
    // ----------------------------------------
    console.log('  ├─ 📸 Capturando Tela de Conta em formato Mobile (390x844)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

    await mobilePage.evaluate((userObj, tokenStr) => {
      localStorage.setItem('criterium_user', JSON.stringify(userObj));
      localStorage.setItem('criterium_token', tokenStr);
      localStorage.setItem('criterium_onboarding_completed', 'true');
      localStorage.setItem('criterium_pwa_modal_dismissed', 'true');
    }, authData.user, authData.token);

    await mobilePage.reload({ waitUntil: 'networkidle0' });
    await delay(1500);

    // Wait until bottom nav shows logged in user
    await mobilePage.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      return btns.some(b => (b.textContent || '').includes('Eleitor'));
    }, { timeout: 5000 });

    // Click on Account tab in Mobile Bottom Nav
    await mobilePage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const userBtn = btns.find(b => (b.textContent || '').includes('Eleitor'));
      if (userBtn) (userBtn as HTMLElement).click();
    });
    await delay(2500);

    const mobilePath = path.join(assetsDir, 'account_preview_mobile.png');
    await mobilePage.screenshot({ path: mobilePath });
    console.log(`  │  └─ ✅ Captura Mobile salva com sucesso em: ${mobilePath}`);

    await browser.close();
    console.log('  └─ 🎉 Captura automatizada de screenshots reais da Conta concluída com sucesso!');
  } catch (err: any) {
    console.error('❌ Erro na captura das screenshots:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
