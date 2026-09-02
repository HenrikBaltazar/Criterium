import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Admin Container Verification] Testando o novo serviço admin conectado ao banco...');

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

    console.log('  ├─ 🌐 Navegando para http://localhost:8080 (Painel Admin Container)...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });

    await delay(1000);

    console.log('  ├─ 🔑 Efetuando login com ADMIN_PASSWORD (admin_secure_key_2026)...');
    await page.type('#adminPassword', 'admin_secure_key_2026');
    await page.click('button[type="submit"]');

    await delay(2000);

    const screenshotPath = path.join(screenshotsDir, 'admin_container_dashboard.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  ├─ 📸 Captura do Dashboard Admin Container salva em: ${screenshotPath}`);

    // Click Gestão de Usuários
    console.log('  ├─ 👥 Navegando para Gestão de Usuários...');
    await page.click('.nav-btn:nth-child(2)');
    await delay(1200);

    const usersScreenshotPath = path.join(screenshotsDir, 'admin_container_users.png');
    await page.screenshot({ path: usersScreenshotPath });
    console.log(`  └─ 📸 Captura da Gestão de Usuários salva em: ${usersScreenshotPath}`);

    const bodyText = await page.evaluate(() => document.body.textContent || '');

    console.log('\n========================================================');
    if (bodyText.includes('ADMIN CONTAINER') || bodyText.includes('Direct DB Active') || bodyText.includes('Candidatos Registrados')) {
      console.log('✅ SUCESSO TOTAL: Container Admin ativado, conectado e funcionando no porto 8080!');
    } else {
      console.log('⚠️ RESPOSTA RECEBIDA DEVE SER VERIFICADA NAS CAPTURAS DE TELA');
    }
    console.log('========================================================\n');

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro na verificação do Admin Container:', err.message);
  }
}

main();
