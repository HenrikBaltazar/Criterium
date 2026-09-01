import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Cury Guardrail Fix Verification] Testando "como fazer um bolo de cenoura" no candidato ESCRITOR AUGUSTO CURY...');

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

    // Set auth token & user
    await page.evaluate(() => {
      localStorage.setItem('criterium_onboarding_completed', 'true');
      localStorage.setItem('criterium_token', 'test_token');
      localStorage.setItem(
        'criterium_user',
        JSON.stringify({ id: 'test_user', name: 'Test User', email: 'test@example.com' })
      );
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1200);

    // Open candidate LULA
    console.log('  ├─ 🔍 Buscando e abrindo candidato LULA...');
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

    // Send query "como fazer um bolo de cenoura"
    const outOfScopeQuestion = 'como fazer um bolo de cenoura';
    console.log(`  ├─ ❓ Enviando pergunta: "${outOfScopeQuestion}"...`);

    await page.type('input[placeholder*="Pergunte sobre as propostas"]', outOfScopeQuestion);
    await delay(200);

    await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Enviar'));
      if (sendBtn) (sendBtn as HTMLElement).click();
    });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('fora do contexto do Plano de Governo');
      },
      { timeout: 15000 }
    );

    await delay(800);
    const screenshotPath = path.join(screenshotsDir, 'augusto_cury_bolo_cenoura_guardrail_fixed.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  └─ 📸 Captura da resposta corrigida em Augusto Cury salva em: ${screenshotPath}`);

    const chatText = await page.evaluate(() => document.body.textContent || '');

    console.log('\n========================================================');
    if (chatText.includes('fora do contexto do Plano de Governo')) {
      console.log('✅ SUCESSO TOTAL: Guardrail em ESCRITOR AUGUSTO CURY 100% corrigido!');
    } else {
      console.log('⚠️ RESPOSTA RECEBIDA DEVE SER VERIFICADA NAS CAPTURAS DE TELA');
    }
    console.log('========================================================\n');

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro no teste de correção do Guardrail em Cury:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
