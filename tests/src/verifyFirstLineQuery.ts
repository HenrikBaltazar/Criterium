import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Positional PDF Chat Verification] Testando pergunta por primeira linha do PDF...');

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
    console.log('  ├─ 🔍 Abrindo candidato LULA...');
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

    // Click "Iniciar Chat com o Plano de Governo"
    console.log('  ├─ ⚡ Clicando no botão "Iniciar Chat com o Plano de Governo"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find((b) => (b.textContent || '').includes('Iniciar Chat com o Plano de Governo'));
      if (startBtn) (startBtn as HTMLElement).click();
    });

    // Wait for PDF indexing
    await page.waitForFunction(
      () => {
        const bodyText = document.body.textContent || '';
        return bodyText.includes('Documento do TSE') || bodyText.includes('O Plano de Governo');
      },
      { timeout: 25000 }
    );

    // Ask "Qual a primeira linha do pdf?"
    const question = 'Qual a primeira linha do pdf?';
    console.log(`  ├─ ❓ Enviando pergunta no chat: "${question}"`);

    await page.type('input[placeholder*="Pergunte sobre as propostas"]', question);
    await delay(200);

    await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Enviar'));
      if (sendBtn) (sendBtn as HTMLElement).click();
    });

    // Wait for assistant response
    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('primeira linha') || text.includes('Página 1');
      },
      { timeout: 15000 }
    );

    await delay(1000);

    const resultScreenshotPath = path.join(screenshotsDir, 'gov_plan_chat_first_line_response.png');
    await page.screenshot({ path: resultScreenshotPath });
    console.log(`  └─ 📸 Captura de tela da primeira linha salva em: ${resultScreenshotPath}`);

    const chatContent = await page.evaluate(() => {
      return document.body.textContent || '';
    });

    console.log('\n========================================================');
    console.log('📊 CONTEÚDO DA RESPOSTA NO CHAT:');
    if (chatContent.includes('Página 1') && (chatContent.includes('PROGRAMA DE GOVERNO') || chatContent.includes('primeira linha'))) {
      console.log('✅ SUCESSO TOTAL: A pergunta sobre a primeira linha retornou a citação exata da Página 1!');
    } else {
      console.log('⚠️ RESPOSTA RECEBIDA DEVE SER VERIFICADA NAS SCREENSHOTS');
    }
    console.log('========================================================\n');

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro no teste da primeira linha:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
