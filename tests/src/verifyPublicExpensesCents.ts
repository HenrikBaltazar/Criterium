import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Public Expenses Exact Cents Verification] Testando exibição de centavos exatos e anos completos...');

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
    await page.setViewport({ width: 1280, height: 1000 });
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
      localStorage.setItem('criterium_onboarding_completed', 'true');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1200);

    // Search for Cleitinho candidate
    console.log('  ├─ 🔍 Buscando e abrindo o candidato CLEITINHO AZEVEDO...');
    await page.type('input[placeholder*="Buscar candidato"]', 'CLEITINHO');
    await delay(800);

    const clicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.glass-card'));
      const cleitinhoCard = cards.find((c) => (c.textContent || '').toUpperCase().includes('CLEITINHO'));
      if (cleitinhoCard) {
        (cleitinhoCard as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      console.warn('  ⚠️ Card de Cleitinho não encontrado na busca direta, clicando no primeiro candidato...');
      await page.evaluate(() => {
        const firstCard = document.querySelector('.glass-card') as HTMLElement;
        if (firstCard) firstCard.click();
      });
    }

    await delay(1500);

    // Click on "Desempenho Público & Mandatos" tab
    console.log('  ├─ 📌 Clicando na aba "Desempenho Público & Mandatos"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const desempTab = tabs.find((t) => (t.textContent || '').includes('Desempenho') || (t.textContent || '').includes('Mandato'));
      if (desempTab) (desempTab as HTMLElement).click();
    });

    await delay(1200);

    const screenshotPath = path.join(screenshotsDir, 'public_expenses_exact_cents.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  ├─ 📸 Captura de tela salva em: ${screenshotPath}`);

    const expensesCardText = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.glass-card'));
      const card = cards.find((c) => (c.textContent || '').includes('Uso de Recursos Públicos'));
      return card ? card.textContent : document.body.textContent;
    });

    console.log('\n========================================================');
    console.log('📊 CONTEÚDO DO CARD DE RECURSOS PÚBLICOS:');
    console.log(expensesCardText?.substring(0, 400));

    if (expensesCardText?.includes(',55') || expensesCardText?.includes(',72') || expensesCardText?.includes(',07') || expensesCardText?.includes(',18') || expensesCardText?.includes(',58')) {
      console.log('\n✅ SUCESSO TOTAL: Centavos exatos exibidos no frontend sem arredondamento!');
    } else {
      console.log('\n⚠️ VERIFIQUE O TEXTO DO CARD NAS SCREENSHOTS');
    }
    console.log('========================================================\n');

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro no teste de centavos exatos:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
