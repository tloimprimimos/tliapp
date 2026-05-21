const https = require('https');

exports.handler = async function () {
    return new Promise((resolve) => {
        const options = {
            hostname: 'www.bcv.org.ve',
            path: '/',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-VE,es;q=0.8',
                'Accept-Encoding': 'identity',
                'Connection': 'keep-alive',
            },
            timeout: 15000,
        };

        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        };

        const fail = (code, msg) => resolve({ statusCode: code, headers, body: JSON.stringify({ error: msg }) });

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    let rate = null;

                    // Intento 1: div#dolar > strong
                    const dolarBlock = data.match(/id="dolar"([\s\S]{0,800})/);
                    if (dolarBlock) {
                        const m = dolarBlock[1].match(/<strong>([\d,.]+)<\/strong>/);
                        if (m) rate = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
                    }

                    // Intento 2: busca el primer número razonable cerca de "dolar" o "USD"
                    if (!rate || isNaN(rate) || rate < 1) {
                        const m = data.match(/[Dd]ólar[\s\S]{0,400}?(\d{1,3}[,.]\d{2,8})/);
                        if (m) rate = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
                    }

                    if (rate && !isNaN(rate) && rate > 1 && rate < 10000000) {
                        resolve({
                            statusCode: 200,
                            headers,
                            body: JSON.stringify({
                                rate: parseFloat(rate.toFixed(4)),
                                source: 'BCV',
                                updatedAt: new Date().toISOString(),
                            }),
                        });
                    } else {
                        fail(422, 'No se pudo extraer la tasa del BCV. Ingrésala manualmente.');
                    }
                } catch (e) {
                    fail(500, 'Error al procesar la respuesta: ' + e.message);
                }
            });
        });

        req.on('error', e => fail(500, 'Error de conexión: ' + e.message));
        req.on('timeout', () => { req.destroy(); fail(504, 'Timeout al conectar con BCV'); });
        req.end();
    });
};
