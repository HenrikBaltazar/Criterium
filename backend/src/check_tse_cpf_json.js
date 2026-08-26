const https = require('https');

const url = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/candidatura/buscar/2026/BR/20322002026/candidato/280002551547';
const headers = {
  'accept': 'application/json, text/plain, */*',
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  'referer': 'https://divulgacandcontas.tse.jus.br/'
};

https.get(url, { headers }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('=== TODOS OS CAMPOS DO CANDIDATO NO TSE ===');
      Object.keys(json).forEach(key => {
        const val = json[key];
        if (typeof val !== 'object') {
          console.log(`${key}: ${val}`);
        } else if (Array.isArray(val)) {
          console.log(`${key}: [Array ${val.length}]`);
        } else {
          console.log(`${key}: {Object}`);
        }
      });

      console.log('\n=== PROCURANDO CAMPOS DE CPF OU CONTEÚDO "021" ===');
      for (const [k, v] of Object.entries(json)) {
        if (k.toLowerCase().includes('cpf') || String(v).includes('021') || String(v).includes('368')) {
          console.log(` -> ${k}: ${JSON.stringify(v)}`);
        }
      }
    } catch (e) {
      console.error('Erro ao analisar JSON:', e.message);
    }
  });
}).on('error', err => console.error('Erro na requisição:', err));
