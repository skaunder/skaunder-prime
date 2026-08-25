// Skaunder Prime - Gateway WebSocket Server
// Suporta comunicação de baixa latência entre MT5 (EA) e Painel Web HTML5

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Skaunder Prime Gateway Server is Running\n');
});

const wss = new WebSocket.Server({ server });

let clients = new Set();
let mt5Clients = new Set();

wss.on('connection', (ws, req) => {
    clients.add(ws);
    console.log(`[Skaunder Gateway] Nova conexão estabelecida. Total: ${clients.size}`);

    ws.on('message', (message) => {
        try {
            let data;
            if (typeof message === 'string') {
                data = JSON.parse(message);
            } else {
                // Suporte preliminar a buffers binários de baixa latência
                const text = message.toString('utf-8');
                data = JSON.parse(text);
            }

            // Identificar se a conexão vem do MT5
            if (data.source === 'MT5') {
                mt5Clients.add(ws);
            }

            // Broadcast de ticks ou sinais de absorção para todas as pontas (Painel Web e Robôs)
            broadcast(data, ws);

        } catch (err) {
            console.error('[Skaunder Gateway] Erro no processamento da mensagem:', err.message);
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        mt5Clients.delete(ws);
        console.log(`[Skaunder Gateway] Conexão encerrada. Total restante: ${clients.size}`);
    });

    ws.on('error', (err) => {
        console.error('[Skaunder Gateway] Erro na conexão Socket:', err.message);
    });
});

function broadcast(data, senderWs) {
    const payload = JSON.stringify(data);
    for (let client of clients) {
        if (client !== senderWs && client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    }
}

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Skaunder Prime Server rodando na porta ${PORT}`);
    console.log(`====================================================`);
});
