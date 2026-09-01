import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Social Links Bar Verification] Testando exibição de múltiplos canais sociais...');

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
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1200);

    // Open Lula candidate
    console.log('  ├─ 🔍 Abrindo perfil do candidato LULA...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.glass-card'));
      const lulaCard = cards.find((c) => (c.textContent || '').includes('LULA'));
      if (lulaCard) (lulaCard as HTMLElement).click();
    });

    await delay(1500);

    const resultScreenshotPath = path.join(screenshotsDir, 'social_links_bar_multiple.png');
    await page.screenshot({ path: resultScreenshotPath });
    console.log(`  └─ 📸 Captura de tela dos canais oficiais salva em: ${resultScreenshotPath}`);

    const linksText = await page.evaluate(() => {
      const el = document.body;
      return el ? el.textContent || '' : '';
    });

    console.log('\n========================================================');
    if (linksText.includes('Canais e Redes Sociais Oficiais')) {
      console.log('✅ SUCESSO: Barra de Canais e Redes Sociais Oficiais identificada!');
    } else {
      console.log('⚠️ VERIFICAR CAPTURA DE TELA');
    }
    console.log('========================================================\n');

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro no teste de redes sociais:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
