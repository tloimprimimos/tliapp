const https = require('https');

function fetchJSON(urlStr) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
            },
            timeout: 10000,
        };
        const req = https.request(options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetchJSON(res.headers.location));
            }
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, json: JSON.parse(data) });
                } catch (e) {
                    reject(new Error('No se pudo parsear la respuesta'));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

exports.handler = async function () {
    const cors = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };

    // Intento 1: ve.dolarapi.com — tasa oficial BCV
    try {
        const { status, json } = await fetchJSON('https://ve.dolarapi.com/v1/dolares/oficial');
        const rate = json?.promedio;
        if (status === 200 && rate > 0) {
            return {
                statusCode: 200,
                headers: cors,
                body: JSON.stringify({ rate: parseFloat(rate.toFixed(4)), source: 'BCV · dolarapi.com', updatedAt: new Date().toISOString() }),
            };
        }
    } catch (_) {}

    // Intento 2: pydolarve.org — tasa BCV
    try {
        const { status, json } = await fetchJSON('https://pydolarve.org/api/v1/dollar?page=bcv');
        const rate = json?.price;
        if (status === 200 && rate > 0) {
            return {
                statusCode: 200,
                headers: cors,
                body: JSON.stringify({ rate: parseFloat(parseFloat(rate).toFixed(4)), source: 'BCV · pydolarve.org', updatedAt: new Date().toISOString() }),
            };
        }
    } catch (_) {}

    // Ambos fallaron
    return {
        statusCode: 503,
        headers: cors,
        body: JSON.stringify({ error: 'No se pudo obtener la tasa del BCV. Ingrésala manualmente en Configuración.' }),
    };
};
