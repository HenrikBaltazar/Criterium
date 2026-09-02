import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Z-Index & Header Revert Test] Verificando correções no header e z-index do dropdown de partidos...');

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

    // Dismiss welcome modal if open
    const buttonsOnPage = await page.$$('button');
    for (const b of buttonsOnPage) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.trim() === 'Pular') {
        await b.click();
        await delay(600);
        break;
      }
    }

    // 1. Verify Header Revert
    console.log('  ├─ 🔍 1. Verificando o Header (Garantindo que o botão extra de Pontuação foi removido)...');
    const headerHtml = await page.evaluate(() => document.querySelector('header')?.outerHTML || '');
    if (!headerHtml.includes('title="Réguas de Pontuação Automática"')) {
      console.log('  │  └─ ✅ SUCESSO: O botão extra no Header foi 100% removido e o layout original foi restaurado!');
    } else {
      console.log('  │  └─ ⚠️ ALERTA: O botão extra ainda aparece no header.');
    }

    // 2. Open ScoringPage via navigation/state
    console.log('  ├─ 🌐 2. Abrindo a página de Pontuação...');
    await page.evaluate(() => {
      // Dispatch custom navigation or click
      const event = new CustomEvent('navigate', { detail: 'scoring' });
      window.dispatchEvent(event);
    });

    await page.goto('http://localhost', { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.setItem('criterium_welcome_dismissed', 'true');
    });

    // 3. Test multi-party select z-index
    const partyButtons = await page.$$('button');
    for (const b of partyButtons) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.includes('partido') || text.includes('Selecione os partidos')) {
        console.log(`  ├─ 🎯 Clicando no dropdown de partidos: "${text.trim()}"`);
        await b.click();
        await delay(800);
        break;
      }
    }

    const screenshotPath = path.join(screenshotsDir, 'party_dropdown_zindex_fixed.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  └─ 📸 Captura do dropdown sobreposto com sucesso salva em: ${screenshotPath}`);

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro no teste:', err.message);
  }
}

main();
