var WSServer = require('ws').Server;
var WebSocketClient = require('websocket').client;
const { setMaxListeners } = require('events');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const wsServer = new WSServer({port : process.env.LISTEN_PORT})
const wsClient = new WebSocketClient();



function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

var bridges = {};

wsServer.on('connection', async (socket) => {
    console.log(`New connection from ${socket._socket.remoteAddress}`);
    wsClient.connect(`ws://${process.env.ENDPOINT_IP}:${process.env.ENDPOINT_PORT}`);
    wsClient.on('connectFailed', () => {
        socket.send('endpoint connection failed');
        socket.close();
    });
    wsClient.on('connect', (esocket) => {
        bridges[socket] = esocket; 
    });
    while (bridges[socket] == undefined) await sleep(100);
    bridges[socket].on('message', (message) => {
        console.log(`Message from endpoint: ${message.utf8Data}`);
        socket.send(message.utf8Data);
    });
    bridges[socket].on('close', () => {
        try {
            socket.close();
        }
        catch(ex) {
            console.error(ex.message);
        }
        if (socket in bridges) delete bridges[socket];
    });
    socket.on('message', async (message) => {
        console.log(message.toString());
        bridges[socket].send(message.toString());
    });
    socket.on('close', () => {
        console.log(`Connection with ${socket._socket.remoteAddress} closed`);
        try {
            bridges[socket].close();
        }
        catch(ex) {
            console.error(ex.message);
        }
        if (socket in bridges) delete bridges[socket];
    })
});