import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Party Component Explicit Test] Verificando renderização exata de pontuacao...');

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

    console.log('  ├─ 🌐 Navegando para http://localhost...');
    await page.goto('http://localhost', { waitUntil: 'networkidle0' });
    await delay(1000);

    // Click Pular on Welcome Modal
    const buttonsOnPage = await page.$$('button');
    for (const b of buttonsOnPage) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.trim() === 'Pular') {
        console.log('  ├─ 🎯 Clicando em "Pular" no modal de boas-vindas...');
        await b.click();
        await delay(600);
        break;
      }
    }

    // Click Pontuação button in top header
    const topButtons = await page.$$('button');
    for (const b of topButtons) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.includes('Pontuação')) {
        console.log('  ├─ 🎯 Clicando no botão "Pontuação" do topo...');
        await b.click();
        await delay(1000);
        break;
      }
    }

    const screenshotPath = path.join(screenshotsDir, 'party_component_page.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  ├─ 📸 Captura da página de pontuação salva em: ${screenshotPath}`);

    // Find the MultiPartySelect button
    const buttons = await page.$$('button');
    console.log(`  ├─ Encontrados ${buttons.length} botões na página.`);

    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent || '', btn);
      if (text.includes('partido') || text.includes('Selecione os partidos')) {
        console.log(`  ├─ 🎯 Clicando no botão do componente de partidos: "${text.trim()}"`);
        await btn.click();
        await delay(800);
        break;
      }
    }

    const openScreenshotPath = path.join(screenshotsDir, 'party_component_open.png');
    await page.screenshot({ path: openScreenshotPath });
    console.log(`  └─ 📸 Captura do componente aberto salva em: ${openScreenshotPath}`);

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro no teste do componente:', err.message);
  }
}

main();
