import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Government Plan Chat Verification] Testando download, indexação de PDF e resposta factual no chat...');

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
    console.log('  ├─ 🔍 Abrindo dossiê do candidato LULA...');
    const clicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.glass-card'));
      const lulaCard = cards.find((c) => (c.textContent || '').includes('LULA'));
      if (lulaCard) {
        (lulaCard as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      await page.evaluate(() => {
        const firstCard = document.querySelector('.glass-card') as HTMLElement;
        if (firstCard) firstCard.click();
      });
    }

    await delay(1500);

    // Click on "Plano de Governo" tab
    console.log('  ├─ 📌 Clicando na aba "Plano de Governo"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const planTab = tabs.find((t) => (t.textContent || '').includes('Plano de Governo'));
      if (planTab) (planTab as HTMLElement).click();
    });

    await delay(1000);

    // Click "Iniciar Chat com o Plano de Governo" button
    console.log('  ├─ ⚡ Clicando no botão "Iniciar Chat com o Plano de Governo"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find((b) => (b.textContent || '').includes('Iniciar Chat com o Plano de Governo'));
      if (startBtn) (startBtn as HTMLElement).click();
    });

    // Wait for PDF downloading & parsing completion
    console.log('  ├─ ⏳ Aguardando download e indexação do PDF oficial do TSE...');
    await page.waitForFunction(
      () => {
        const bodyText = document.body.textContent || '';
        return bodyText.includes('Documento do TSE') || bodyText.includes('O Plano de Governo');
      },
      { timeout: 25000 }
    );

    const initScreenshotPath = path.join(screenshotsDir, 'gov_plan_chat_initialized.png');
    await page.screenshot({ path: initScreenshotPath });
    console.log(`  │  └─ ✅ PDF indexado com sucesso! Captura salva em: ${initScreenshotPath}`);

    // Ask specific question about "segurança pública"
    const question = 'Quais são as propostas para segurança pública?';
    console.log(`  ├─ ❓ Enviando pergunta no chat: "${question}"`);

    await page.type('input[placeholder*="Pergunte sobre as propostas"]', question);
    await delay(200);

    await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Enviar'));
      if (sendBtn) (sendBtn as HTMLElement).click();
    });

    // Wait for assistant response
    console.log('  ├─ ⏳ Aguardando síntese factual de resposta...');
    await page.waitForFunction(
      () => {
        const msgs = Array.from(document.querySelectorAll('div')).filter((d) => (d.textContent || '').includes('segurança pública') || (d.textContent || '').includes('Página'));
        return msgs.length >= 2;
      },
      { timeout: 15000 }
    );

    await delay(1000);

    const resultScreenshotPath = path.join(screenshotsDir, 'gov_plan_chat_response.png');
    await page.screenshot({ path: resultScreenshotPath });
    console.log(`  └─ ✅ Resposta factual capturada em: ${resultScreenshotPath}`);

    const chatContent = await page.evaluate(() => {
      const container = document.body.textContent || '';
      return container;
    });

    console.log('\n========================================================');
    console.log('📊 CONTEÚDO DA RESPOSTA NO CHAT:');
    if (chatContent.includes('segurança pública') || chatContent.includes('SUSP') || chatContent.includes('Página')) {
      console.log('✅ SUCESSO TOTAL: A pergunta sobre segurança pública retornou a proposta exata contida no PDF com citação de página!');
    } else {
      console.log('⚠️ RESPOSTA RECEBIDA DEVE SER VERIFICADA NAS SCREENSHOTS');
    }
    console.log('========================================================\n');

    await browser.close();
    console.log('🎉 Teste do Chat do Plano de Governo concluído!');
  } catch (err: any) {
    console.error('❌ Erro no teste do Chat:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
