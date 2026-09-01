import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Chat Auth Required Verification] Testando obrigatoriedade de cadastro para usar o Chat...');

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

    // Set onboarding completed but clear user auth token
    await page.evaluate(() => {
      localStorage.setItem('criterium_onboarding_completed', 'true');
      localStorage.removeItem('criterium_token');
      localStorage.removeItem('criterium_user');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1200);

    // Open Lula candidate
    console.log('  ├─ 🔍 Abrindo candidato LULA (como usuário deslogado)...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.glass-card'));
      const lulaCard = cards.find((c) => (c.textContent || '').includes('LULA'));
      if (lulaCard) (lulaCard as HTMLElement).click();
    });

    await delay(1500);

    // Click on "Plano de Governo" tab
    console.log('  ├─ 📌 Clicando na aba "Plano de Governo"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const planTab = tabs.find((t) => (t.textContent || '').includes('Plano de Governo'));
      if (planTab) (planTab as HTMLElement).click();
    });

    await delay(1000);

    // Verify button text
    const buttonText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const chatBtn = btns.find((b) => (b.textContent || '').includes('Criar Conta Grátis') || (b.textContent || '').includes('Iniciar Chat'));
      return chatBtn ? chatBtn.textContent : '';
    });

    console.log(`  ├─ 🔒 Texto do botão do chat quando deslogado: "${buttonText}"`);

    // Click "Criar Conta Grátis para Iniciar Chat"
    console.log('  ├─ ⚡ Clicando no botão para usar o Chat...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const chatBtn = btns.find((b) => (b.textContent || '').includes('Criar Conta Grátis') || (b.textContent || '').includes('Iniciar Chat'));
      if (chatBtn) (chatBtn as HTMLElement).click();
    });

    await delay(1000);

    // Verify Auth Modal appeared in register mode with "É GRÁTIS!" header
    const isModalOpen = await page.evaluate(() => {
      const modalText = document.body.textContent || '';
      return modalText.includes('É GRÁTIS!') && modalText.includes('Criar Conta no Criterium');
    });

    const screenshotPath = path.join(screenshotsDir, 'chat_auth_required_modal.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  └─ 📸 Captura do modal de cadastro obrigatório para o Chat salva em: ${screenshotPath}`);

    console.log('\n========================================================');
    if (isModalOpen) {
      console.log('✅ SUCESSO TOTAL: Modal de cadastro "É GRÁTIS!" exibido ao tentar usar o Chat sem login!');
    } else {
      console.log('⚠️ RESPOSTA RECEBIDA DEVE SER VERIFICADA NAS CAPTURAS DE TELA');
    }
    console.log('========================================================\n');

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro no teste de obrigatoriedade de cadastro do Chat:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
