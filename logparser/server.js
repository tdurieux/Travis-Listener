const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const express = require('express')
const async = require('async')
const diff_match_patch = require("diff-match-patch");
require('diff-match-patch-line-and-word')
const dmp = new diff_match_patch();

const stripAnsi = require('strip-ansi')

const cleanLog = require('./clean_log').cleanLog
const normalizeLog = require('./clean_log').normalizeLog
const logParser = require("./parser/parser-init").parser;

const app = express();
const server = require('http').Server(app);
var port = process.env.PORT || 4000;

app.use(cookieParser());
app.use(bodyParser.json({limit: '20mb', extended: true}))
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});

app.post('/api/clean', (req, res) => {
  const log = cleanLog(req.body.log);
  return res.send(log).end()
})
app.post('/api/diff', (req, res) => {
  const hrstart = process.hrtime()

  const oldLog = cleanLog(req.body.old);
  const newLog = cleanLog(req.body.new);

  async.parallel([
    async () => logParser(oldLog),
    async () => logParser(newLog),
    (callback) => {
      const cleanedNewLog = normalizeLog(newLog)
      const cleanedOldLog = normalizeLog(oldLog)
      const diffs = dmp.diff_lineMode(cleanedOldLog, cleanedNewLog);
      const lines = []
      for (let diff of diffs) {
          let op = ' ';
          if (diff[0] == -1) {
              op = '-'
          } else if (diff[0] == 1) {
              op = '+'
          }
          const ll = diff[1].split('\n')
          for (let l of ll) {
              lines.push(op + l)
          }
      }
      const output = []
      for (let line of lines) {
          if (line[0] != '-') {
              continue
          }
          if (lines.indexOf('+'+line.substring(1)) > -1) {
              continue;
          }
          output.push(line.substring(1))
      }
      callback(null, output.join('\n'))
    }], (err, results) => {
      if (err) {
        console.log(err)
        return res.status(500).send(err).end()
      }
      const output = {
        analysis: {
          original: results[0],
          restarted: results[1],
        },
        logDiff: results[2]
      }

      var hrend = process.hrtime(hrstart)
      console.info('Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000)
      return res.json(output).end()
  })
})

server.listen(port, function () {
    var port = server.address().port;
    console.log('App running on port ' + port);
});