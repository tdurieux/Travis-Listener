const proxy = require('express-http-proxy')
const express = require('express')
const app = express();
const server = require('http').Server(app);

var port = process.env.PORT || 4000;

function getToken() {
  const tokens =  []
  return tokens[Math.round(Math.random() * (tokens.length -1))]
}

app.use(proxy('api.github.com', {
  https: true,
  proxyReqPathResolver: function (req) {
    return req.url;
  },
  userResHeaderDecorator(headers, userReq, userRes, proxyReq, proxyRes) {
    // console.log(headers['x-ratelimit-remaining']);
    // console.log(new Date(parseInt(headers['x-ratelimit-reset'])*1000));
    return headers;
  },
  proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
    proxyReqOpts.headers['Authorization'] = 'token ' + getToken();
    // proxyReqOpts.headers['Accept'] = 'application/vnd.github.v3+json'
    proxyReqOpts.headers['User-Agent'] = 'Awesome-Octocat-App'
    return proxyReqOpts;
  }
}));

server.listen(port, function () {
    var port = server.address().port;
    console.log('App running on port ' + port);
});
