const express = require('express')
const MongoClient = require('mongodb').MongoClient;
const Travis = require('travis-ci');
const Agenda = require('agenda');

var port = process.env.PORT || 4000;
const mongoURL = "mongodb://mongo:27017";

const agenda = new Agenda({db: {address: mongoURL + '/agenda'}});

const travis = new Travis({
    version: '2.0.0'
});

const client = new MongoClient(mongoURL, {useNewUrlParser: true, useUnifiedTopology: true});

const app = express();
const server = require('http').Server(app);

(async _ => {
    await client.connect();

    const buildsaver_db = client.db("buildsaver");
    const db = client.db("restartedbuilds");

    // create collection
    const buildsCollection = await db.createCollection( "builds", { storageEngine: {wiredTiger: { configString: "blockCompressor=zlib" }}})
    const jobsCollection = await db.createCollection( "jobs", { storageEngine: {wiredTiger: { configString: "blockCompressor=zlib" }}})
    const logCollection = await db.createCollection( "logs", { storageEngine: {wiredTiger: { configString: "blockCompressor=zlib" }}})

    // create index
    await buildsCollection.createIndex('id', {unique: true})
    await jobsCollection.createIndex('id', {unique: true})
    await logCollection.createIndex('id', {unique: true})

    require('./jobs/fetchRestartedBuilds')(agenda, db, buildsaver_db);
    require('./jobs/fetchRestartedJobs')(agenda, db, buildsaver_db);
    agenda.start();

    console.log("Restarted Service initialized");
    
    app.get("/api/builds/fetch", async function (req, res) {
        const TASK_NAME = 'fetch restarted builds'
        const lastJobs = await agenda.jobs({name: TASK_NAME}, {_id: -1}, 1);
        if (lastJobs.length == 0) {
            res.json({status: 'ok', job: await agenda.now(TASK_NAME)});
        } else {
            const lastJob = lastJobs[0]
            if (lastJob.attrs.lockedAt == null && lastJob.attrs.lastRunAt != null) {
                res.json({status: 'ok', job: await agenda.now(TASK_NAME, lastJob.attrs.data)});
            } else {
                res.json({status: 'still_running', job: lastJob});
            }
        }
    });

    app.get("/api/jobs/fetch", async function (req, res) {
        const TASK_NAME = 'fetch restarted jobs'
        const lastJobs = await agenda.jobs({name: TASK_NAME}, {_id: -1}, 1);
        if (lastJobs.length == 0) {
            res.json({status: 'ok', job: await agenda.now(TASK_NAME)});
        } else {
            const lastJob = lastJobs[0]
            if (lastJob.attrs.lockedAt == null && lastJob.attrs.lastRunAt != null) {
                res.json({status: 'ok', job: await agenda.now(TASK_NAME, lastJob.attrs.data)});
            } else {
                res.json({status: 'still_running', job: lastJob});
            }
        }
    });

    app.get("/api/tasks", async function (req, res) {
        const lastBuilds = await agenda.jobs({name: 'fetch restarted builds'}, {_id: -1}, 1);
        const lastJobs = await agenda.jobs({name: 'fetch restarted jobs'}, {_id: -1}, 1);
        res.json({
            build: lastBuilds[0],
            job: lastJobs[0],
        });
    });

    app.get("/api/builds", async function (req, res) {
        const builds = await buildsCollection.find().toArray();
        res.json(builds);
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
    
    app.use('/', express.static(__dirname + '/static'));
    
    server.listen(port, function () {
        var port = server.address().port;
        console.log('App running on port ' + port);
    });
})()

async function graceful() {
    console.log('exit')
    await agenda.stop();
    await client.close();
    process.exit(0);
}

process.on('exit', graceful);
process.on('SIGINT', graceful);
process.on('SIGUSR1', graceful);
process.on('SIGUSR2', graceful);
process.on('uncaughtException' , graceful);
