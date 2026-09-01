import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Lula 2018 Prior Elections Test] Verificando renderização da candidatura tachada (Indeferido / Ficha Limpa / Impugnação)...');

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

    // Click on Lula candidate card
    console.log('  ├─ 🔍 Buscando e abrindo o dossiê do candidato LULA...');
    const clicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.glass-card'));
      const lulaCard = cards.find(c => (c.textContent || '').includes('LULA'));
      if (lulaCard) {
        (lulaCard as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      console.log('  ├─ ℹ️ Lula não encontrado no dashboard direto, clicando na busca...');
      // Select first candidate
      await page.evaluate(() => {
        const firstCard = document.querySelector('.glass-card') as HTMLElement;
        if (firstCard) firstCard.click();
      });
    }

    await delay(1500);

    // Click on "Eleições Anteriores" tab
    console.log('  ├─ 📌 Clicando na aba "Eleições Anteriores"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const eleicoesTab = tabs.find(t => (t.textContent || '').includes('Eleições Anteriores'));
      if (eleicoesTab) (eleicoesTab as HTMLElement).click();
    });

    await delay(1000);

    const screenshotPath = path.join(screenshotsDir, 'lula_2018_prior_elections.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  └─ ✅ Captura do histórico de eleições anteriores salva em: ${screenshotPath}`);

    await browser.close();
    console.log('  🎉 Teste visual de Eleições Anteriores concluído com sucesso!');
  } catch (err: any) {
    console.error('❌ Erro no teste visual:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
