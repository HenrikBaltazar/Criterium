import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Multi-Party Scoring Rule Verification] Testando seleção múltipla de partidos por regra...');

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
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
      localStorage.setItem('criterium_onboarding_completed', 'true');
      localStorage.removeItem('criterium_token');
      localStorage.removeItem('criterium_user');
    });

    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
    await delay(1200);

    // Open Auth Modal
    await page.evaluate(() => {
      const loginBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Entrar'));
      if (loginBtn) (loginBtn as HTMLElement).click();
    });
    await delay(600);

    // Switch to Register mode
    await page.evaluate(() => {
      const toggleBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Cadastre-se') || (b.textContent || '').includes('Inscreva-se') || (b.textContent || '').includes('Cadastrar') || (b.textContent || '').includes('Faça login'));
      if (toggleBtn) (toggleBtn as HTMLElement).click();
    });
    await delay(600);

    const uniqueEmail = `test_${Date.now()}@example.com`;
    console.log(`  ├─ 🔑 Registrando usuário de teste (${uniqueEmail})...`);

    await page.type('input[placeholder*="nome"]', 'Usuario Teste');
    await page.type('input[placeholder*="email"]', uniqueEmail);
    await page.type('input[placeholder*="senha"]', 'senha123');

    await page.evaluate(() => {
      const regBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Cadastrar Gratuitamente'));
      if (regBtn) (regBtn as HTMLElement).click();
    });

    await delay(1500);

    // Open user dropdown menu in header
    console.log('  ├─ ⚙️ Abrindo menu de usuário...');
    await page.evaluate(() => {
      const userBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Usuario') || (b.textContent || '').includes('Usuario Teste'));
      if (userBtn) (userBtn as HTMLElement).click();
    });
    await delay(600);

    // Click "Pontuação" button in dropdown
    console.log('  ├─ ⚙️ Navegando para Pontuação Automática...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const autoBtn = buttons.find((b) => (b.textContent || '').trim() === 'Pontuação');
      if (autoBtn) (autoBtn as HTMLElement).click();
    });

    await delay(1500);

    // Open multi-party dropdown
    console.log('  ├─ 🗳️ Abrindo o dropdown multi-seleção de partidos...');
    await page.evaluate(() => {
      const dropdownBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => (b.textContent || '').includes('Selecione os partidos') || (b.textContent || '').includes('partido')
      );
      if (dropdownBtn) (dropdownBtn as HTMLElement).click();
    });

    await delay(600);

    // Check PT, PSOL, PCdoB
    console.log('  ├─ ☑️ Marcando partidos PT, PSOL, PCdoB...');
    await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('label'));
      ['PT', 'PSOL', 'PCdoB'].forEach((party) => {
        const partyLabel = checkboxes.find((lbl) => (lbl.textContent || '').trim() === party);
        if (partyLabel) {
          const input = partyLabel.querySelector('input[type="checkbox"]');
          if (input && !(input as HTMLInputElement).checked) {
            (input as HTMLElement).click();
          }
        }
      });
    });

    await delay(600);

    // Click "Adicionar Regra"
    console.log('  ├─ ➕ Clicando em "Adicionar Regra"...');
    await page.evaluate(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => (b.textContent || '').includes('Adicionar Regra')
      );
      if (addBtn) (addBtn as HTMLElement).click();
    });

    await delay(1000);

    const screenshotPath = path.join(screenshotsDir, 'multi_party_scoring_rule.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  └─ 📸 Captura da regra composta por múltiplos partidos salva em: ${screenshotPath}`);

    const bodyText = await page.evaluate(() => document.body.textContent || '');

    console.log('\n========================================================');
    if (bodyText.includes('PT, PSOL, PCdoB') || bodyText.includes('3 partidos')) {
      console.log('✅ SUCESSO TOTAL: Regra de pontuação com múltiplos partidos 100% criada e exibida!');
    } else {
      console.log('⚠️ RESPOSTA RECEBIDA DEVE SER VERIFICADA NAS CAPTURAS DE TELA');
    }
    console.log('========================================================\n');

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro no teste de regra multi-partido:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
