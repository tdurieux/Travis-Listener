const express = require('express')
const compression = require('compression')
const MongoClient = require('mongodb').MongoClient;
const Agenda = require('agenda');
const request = require('request');

const stat = require('./stat').stat

var port = process.env.PORT || 4000;
const mongoURL = "mongodb://mongo:27017";

const agenda = new Agenda({db: {address: mongoURL + '/agenda'}});

const client = new MongoClient(mongoURL, {useNewUrlParser: true, useUnifiedTopology: true});

const app = express();
app.use(compression())

const server = require('http').Server(app);

app.use('/', express.static(__dirname + '/static'));
    
server.listen(port, function () {
    var port = server.address().port;
    console.log('App running on port ' + port);
});

(async _ => {
    await client.connect();

    const buildsaver_db = client.db("buildsaver");
    const db = client.db("restartedbuilds");

    // create collection
    const buildsCollection = await db.createCollection( "builds")
    const jobsCollection = await db.createCollection( "jobs")
    const logCollection = await db.createCollection( "logs")
    const buildSaverLogCollection = await buildsaver_db.createCollection( "logs")

    // create index
    await buildsCollection.createIndex('id', {unique: true})
    await jobsCollection.createIndex('id', {unique: true})
    await logCollection.createIndex('id', {unique: true})

    require('./jobs/fetchRestartedBuilds')(agenda, db, buildsaver_db);
    require('./jobs/fetchRestartedJobs')(agenda, db, buildsaver_db);
    require('./jobs/analyzeLogs')(agenda, db, buildsaver_db);
    require('./jobs/analyzeAllLogs')(agenda, db, buildsaver_db);
    require('./jobs/reduceLogSize')(agenda, db, buildsaver_db);
    agenda.start();

    await agenda.every("one hour", 'fetch restarted builds')
    await agenda.every("one hour", 'fetch restarted jobs')

    console.log("Restarted Service initialized");
    
    async function startTask(taskName, res) {
        const lastJobs = await agenda.jobs({name: taskName}, {_id: -1}, 1);
        if (lastJobs.length == 0) {
            res.json({status: 'ok', job: await agenda.now(taskName)});
        } else {
            const lastJob = lastJobs[0]
            if ((lastJob.attrs.lockedAt == null && lastJob.attrs.lastRunAt != null) || lastJob.attrs.failedAt) {
                res.json({status: 'ok', job: await agenda.now(taskName)});
            } else {
                res.json({status: 'still_running', job: lastJob});
            }
        }
    }
    app.get("/api/logs/analyze", async function (req, res) {
        const TASK_NAME = 'analyze all jobs'
        startTask(TASK_NAME, res)
    });
    app.get("/api/logs/reduce", async function (req, res) {
        const TASK_NAME = 'reduceLogSize'
        startTask(TASK_NAME, res)
    });
    app.get("/api/builds/fetch", async function (req, res) {
        const TASK_NAME = 'fetch restarted builds'
        startTask(TASK_NAME, res)
    });

    app.get("/api/jobs/analyze", async (req, res) => {
        const TASK_NAME = 'analyze jobs'
        startTask(TASK_NAME, res)
    })

    app.get("/api/jobs/fetch", async function (req, res) {
        const TASK_NAME = 'fetch restarted jobs'
        startTask(TASK_NAME, res)
    });

    app.get("/api/tasks", async function (req, res) {
        const lastBuilds = await agenda.jobs({name: 'fetch restarted builds'}, {_id: -1}, 1);
        const lastJobs = await agenda.jobs({name: 'fetch restarted jobs'}, {_id: -1}, 1);
        const lastJobAnalysis = await agenda.jobs({name: 'analyze jobs'}, {_id: -1}, 1);
        res.json({
            build: lastBuilds[0],
            job: lastJobs[0],
            lastJobAnalysis: lastJobAnalysis[0]
        });
    });

    app.get("/api/builds", async function (req, res) {
        const builds = await buildsCollection.find({ $where : "this.old.state != this.new.state"}).toArray();
        res.json(builds);
    });
    app.get("/api/jobs", async function (req, res) {
        const items = await jobsCollection.aggregate([
            {
              '$lookup': {
                'from': 'logs', 
                'localField': 'id', 
                'foreignField': 'id', 
                'as': 'log'
              }
            }, {
              '$unwind': {
                'path': '$log', 
                'preserveNullAndEmptyArrays': false
              }
            }, {
              '$match': {
                'log.analysis.original.reasons.0': {
                  '$exists': 0
                }
              }
            }
          ]).limit(100).toArray();
        res.json(items);
    });

    app.get("/api/build/:id", async function (req, res) {
        res.json(await buildsCollection.aggregate([
            {
                '$match': {
                    'id': parseInt(req.params.id)
                }
            },
            {
              '$lookup': {
                'from': 'jobs', 
                'localField': 'old.job_ids', 
                'foreignField': 'id', 
                'as': 'jobs'
              }
            }, {
              '$lookup': {
                'from': 'logs', 
                'localField': 'old.job_ids', 
                'foreignField': 'id', 
                'as': 'logs'
              }
            }
          ]).limit(1).next());
    });

    app.get("/api/job/diff/:id", async function (req, res) {
        const jobId = parseInt(req.params.id)
        const restartedLog = await logCollection.findOne({"id": jobId})
        if (restartedLog == null) {
            return res.status(404).send().end()
        }
        const oldResult = await buildSaverLogCollection.findOne({"id": jobId})
        if (oldResult == null) {
            return res.status(404).send().end()
        }
        request.post('http://logparser/api/diff', {
            timeout: 5000,
            body: {new: restartedLog.log, old: oldResult.log},
            json: true
        }, async function (err, t, output) {
            // const result = JSON.parse(body);
            if (output != null) {
                restartedLog.analysis = output.analysis;
                restartedLog.logDiff = output.logDiff;

                await logCollection.updateOne({id: restartedLog.id}, {$set: restartedLog}, {upsert: true})
            }

            return res.json(output)
        });
    })

    app.get("/job/:id", async function (req, res) {
        const jobId = parseInt(req.params.id)
        const result = await buildSaverLogCollection.findOne({"id": jobId})
        if (result) {
            res.send(cleanLog(result.log)).end()
        } else {
            res.status(404).send().end()
        }
    })

    app.get('/api/stat/', async function (req, res) {
        const results = await stat(buildsCollection, jobsCollection, logCollection, buildsaver_db.collection('builds'))
        res.json(results);
    })
})()

async function graceful() {
    console.log('exit', arguments)
    await agenda.stop();
    await client.close();
    process.exit(0);
}

process.on('exit', graceful);
process.on('SIGINT', graceful);
process.on('SIGUSR1', graceful);
process.on('SIGUSR2', graceful);
process.on('uncaughtException' , graceful);
