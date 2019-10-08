const methodOverride = require('method-override')
const express = require('express')
const WebSocket = require('ws');
const app = express();
const server = require('http').Server(app);
const scanner = require('./travis_scanner')

var port = process.env.PORT || 4000;

const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);
});

setInterval(function ping() {
    wss.clients.forEach(client => {
        if (client.isAlive === false) {
            return client.terminate();
        }
        client.isAlive = false;
        client.ping(() => {});
    });
}, 30000);


wss.broadcast = function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data), error => {
                if (error) {
                    console.error(error);
                }
            });
        }
    });
};


app.use(methodOverride('X-HTTP-Method-Override'));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});

scanner.scan();
scanner.emitter.on("job", job => {
  wss.broadcast({
      event: "job",
      data: job
  })
});
scanner.emitter.on("build", build => {
  wss.broadcast({
      event: "build",
      data: build
  })
});
scanner.emitter.on("job_finished", job => {
  wss.broadcast({
      event: "job_finished",
      data: job
  });
});
scanner.emitter.on("job_updated", job => {
  wss.broadcast({
      event: "job_updated",
      data: job
  })
})
scanner.emitter.on("build_finished", job => {
  wss.broadcast({
      event: "build_finished",
      data: job
  });
});
scanner.emitter.on("build_updated", job => {
  wss.broadcast({
      event: "build_updated",
      data: job
  })
})
server.listen(port, function () {
    var port = server.address().port;
    console.log('App running on port ' + port);
});