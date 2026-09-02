import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Multi-Select Dropdowns Test] Verificando seleção múltipla para Instrução e Ocupação...');

  const screenshotsDir = '/home/henrik/workspace/Criterium/tests/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless=new'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });

    console.log('  ├─ 🌐 Navegando para a aplicação...');
    await page.goto('http://localhost', { waitUntil: 'networkidle0' });
    await delay(1000);

    console.log('  ├─ 🌐 Configurando localStorage e navegando para a aplicação...');
    await page.goto('http://localhost', { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.setItem('criterium_welcome_dismissed', 'true');
    });

    // Open scoring tab
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.includes('Entrar') || text.includes('Ranking')) {
        // Open user dropdown if logged in or click Pular
      }
    }

    // Test Multi-Select on Grau de Instrução
    console.log('  ├─ 🎯 Testando dropdown de múltipla escolha para Grau de Instrução...');
    const eduButtons = await page.$$('button');
    for (const b of eduButtons) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.includes('grau de instrução')) {
        await b.click();
        await delay(500);
        break;
      }
    }

    const screenshotPath = path.join(screenshotsDir, 'all_multiselect_dropdowns.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  └─ 📸 Captura dos dropdowns de múltipla escolha salva em: ${screenshotPath}`);

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro no teste:', err.message);
  }
}

main();
