const request = require('request')
const stripAnsi = require('strip-ansi');
const Travis = require('travis-ci');
const jsdiff = require('diff');

const travis = new Travis({
    version: '2.0.0'
});

module.exports = function(agenda, restartedDB, buildsaverDB) {
    const buildsCollection = restartedDB.collection('builds')
    const jobsCollection = restartedDB.collection('jobs')
    const logCollection = restartedDB.collection('logs')


    async function saveLog(jobId) {
        const log = await logCollection.findOne({"id": jobId});
        const oldLog = await buildsaverDB.collection('logs').findOne({"id": jobId});
        if (!log && oldLog) {
            request('https://api.travis-ci.org/jobs/' + jobId + '/log', function (err, resp, body) {
                if (body != null && body.length > 0) {
                    if (body[0] == '{') {
                        console.log(Object.keys(body))
                    }
                    // body = stripAnsi(body)
                    logCollection.insertOne({
                        id: jobId,
                        //diff: jsdiff.createPatch('log', oldLog.log, body),
                        log: body
                    })
                }
            })
        }
    }

    async function getJobsFromIds(jobIds) {
        return new Promise((resolve, reject) => {
            travis.jobs('?ids[]=' + jobIds.join('&ids[]=') + "&random=" + Math.random()).get((err, data) => {
                if (err) {
                    return reject(err);
                }
                let items = data.jobs;
                const commits = data.commits;
    
                for(let i in items) {
                    if (items[i].started_at) {
                        items[i].started_at = new Date(items[i].started_at)
                    }
                    if (items[i].finished_at) {
                        items[i].finished_at = new Date(items[i].finished_at)
                    }
                    items[i].commit = commits[i];
                }
                return resolve(items);
            });
        });
    };

    async function getNewJobs(jobs) {
        const restartedJobs = []
        const jobObj = {};
        for (let job of jobs) {
            jobObj[job.id] = job
        }
        const newJobs = await getJobsFromIds(Object.keys(jobObj));
        for (let job of newJobs) {
            delete job.commit;
            delete job.config;
            
            
            if (jobObj[job.id].started_at < job.started_at && job.state != 'started') {
                restartedJobs.push({
                    id: job.id,
                    wait_time: job.started_at - jobObj[job.id].started_at,
                    old: jobObj[job.id],
                    new: job
                });
            }
        }
        return restartedJobs;
    }

    agenda.define('fetch restarted jobs', {concurrency: 1}, async job => {

        let skip = 0
        if (job.attrs.data && job.attrs.data.index && job.attrs.data.index < job.attrs.total) {
            skip = job.attrs.data.index
        }

        let currentJobsID = []

        const cursor = buildsCollection.aggregate([
            {
            '$lookup': {
                'from': 'jobs', 
                'localField': 'old.job_ids', 
                'foreignField': 'id', 
                'as': 'jobs'
            }
            }, {
            '$match': {
                'jobs': {
                '$eq': []
                }
            }
        }]);

        let count = 0
        
        while ((build = await cursor.next())) {
            if (count < skip) {
                count++;
                continue
            }
            for (let jobId of build.old.job_ids) {
                currentJobsID.push(jobId)

                if (currentJobsID.length >= 50) {
                    const savedJobs = await buildsaverDB.collection('jobs').find({$or: currentJobsID.map(id => {return {id: id}})}).toArray()

                    const newJobs = await getNewJobs(savedJobs);
                    if (currentJobsID.length > 0) {
                        try {
                            await jobsCollection.insertMany(newJobs)
                        } catch (error) {
                            // ignore
                        }
                        for (let job of newJobs) {
                            saveLog(job.id)
                        }
                        currentJobsID = []
                        job.attrs.data = {index: count, total: restartedBuilds.length}
                        await job.save();
                    }
                }
            }
            count++;
        }
        if (currentJobsID.length > 0) {
            const savedJobs = await buildsaverDB.collection('jobs').find({$or: currentJobsID.map(id => {return {id: id}})}).toArray()

            const newJobs = await getNewJobs(savedJobs);
            if (currentJobsID.length > 0) {
                try {
                    await jobsCollection.insertMany(newJobs)
                } catch (error) {
                    // ignore
                }
                for (let job of newJobs) {
                    saveLog(job.id)
                }
            }
        }
        job.attrs.data = {index: count, total: restartedBuilds.length}
        await job.save();
    });
};