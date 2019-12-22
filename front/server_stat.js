const express = require('express')
const app = express();
const server = require('http').Server(app);
const WebSocket = require('ws');
const dockerstats = require('dockerstats');

const APP_NAME = 'builds-awareness'
var port = process.env.SERVICE_PORT || 5525;

const webSockets = []

const wssServer = new WebSocket.Server({ server });

wssServer.broadcast = function broadcast(data) {
    wssServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data, error => {
                if (error) {
                    console.error(error);
                }
            });
        }
    });
};

wssServer.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);
});

const getStat = async () => {
    try {
        let data = await dockerstats.dockerContainers();
        const output = {
            services: {},
            connectedClient: 0
        }
        const promises = []
        const names = []
        for (let container of data) {
            if (container.name.indexOf(APP_NAME) > -1) {
                promises.push(dockerstats.dockerContainerStats(container.id))
                names.push(container.name.replace(APP_NAME + '_', ''))
            }
        }
        const results = await Promise.all(promises)
        for (let i in results) {
            const stat = results[i][0];
            const name = names[i];
            output.services[name] = {
                mem_usage: stat.mem_usage,
                mem_limit: stat.mem_limit,
                mem_percent: stat.mem_percent,
                cpu_percent: stat.cpu_percent,
                net_in: stat.netIO.rx,
                net_out: stat.netIO.tx
            }
        }

        for (let webSocket of webSockets) {
            output.connectedClient += webSocket.clients.size || 0
        }
        wssServer.broadcast(JSON.stringify({
            'event': 'os',
            'data': output
        }))   
    } catch (error) {
        console.log(error)
    } finally {
        setTimeout(getStat, 500);
    }
}

getStat();

server.listen(port, function (err) {
    var port = server.address().port;
    console.log('Server Stat Service running on port ' + port);
});

module.exports.monitorWebSocket = function (webSocket) {
    webSockets.push(webSocket)
}