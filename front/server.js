const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const express = require('express')
const app = express();
const server = require('http').Server(app);
const request = require('request');
const WebSocket = require('ws');

const wssClient = new WebSocket('ws://listener');

app.use('/', express.static(__dirname + '/static'));

var port = process.env.PORT || 4000;

app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});

const wssServer = new WebSocket.Server({ server });

wssServer.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);
});

setInterval(function ping() {
    wssServer.clients.forEach(client => {
        if (client.isAlive === false) {
            return client.terminate();
        }
        client.isAlive = false;
        client.ping(() => {});
    });
}, 30000);


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
wssClient.on('message', function incoming(data) {
  wssServer.broadcast(data)
});


app.all("*", function (req, res) {
    request('http://github/repositories/20633049', function (error, response, body) {
        console.log('here', JSON.parse(body))
        res.json((body));
    });
});

server.listen(port, function () {
    var port = server.address().port;
    console.log('App running on port ' + port);
});