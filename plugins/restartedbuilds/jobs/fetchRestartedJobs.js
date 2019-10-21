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

    const jobsBuildsaverCollection = buildsaverDB.collection('jobs')
    const logBuildsaverCollection = buildsaverDB.collection('logs')


    function saveLog(jobId) {
        return new Promise(async resolve => {
            const log = await logCollection.findOne({"id": jobId});
            const oldLog = await logBuildsaverCollection.findOne({"id": jobId});
            if (!log && oldLog) {
                request('https://api.travis-ci.org/jobs/' + jobId + '/log', function (err, resp, body) {
                    if (body != null && body.length > 0) {
                        if (body[0] == '{') {
                            console.log(body)
                        }
                        // body = stripAnsi(body)
                        logCollection.insertOne({
                            id: jobId,
                            //diff: jsdiff.createPatch('log', oldLog.log, body),
                            log: body
                        }, err => {
                            resolve(jobId)
                        })
                    } else {
                        resolve(jobId)
                    }
                })
            } else {
                resolve(jobId)
            }
        })
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

        // [
        //     {
        //     '$lookup': {
        //         'from': 'jobs', 
        //         'localField': 'old.job_ids', 
        //         'foreignField': 'id', 
        //         'as': 'jobs'
        //     }
        //     }, {
        //     '$match': {
        //         'jobs': {
        //         '$eq': []
        //         }
        //     }
        // }]
        const cursor = buildsCollection.find();

        const nbBuilds = 0

        let count = 0
        
        while ((build = await cursor.next())) {
            if (count < skip) {
                count++;
                continue
            }
            console.log("Build", build.id)
            for (let jobId of build.old.job_ids) {
                const currentJob = await jobsCollection.findOne({id: jobId});
                if (currentJob != null) {
                    // job exist skip
                    continue
                }
                currentJobsID.push(jobId)

                if (currentJobsID.length >= 10) {
                    console.log("Fetch Jobs", currentJobsID.join(' '))
                    const savedJobs = await jobsBuildsaverCollection.find({$or: currentJobsID.map(id => {return {id: id}})}).toArray()
                    console.log("End Fetch Jobs", currentJobsID.join(' '))

                    console.log("Get jobs", currentJobsID.join(' '))
                    const newJobs = await getNewJobs(savedJobs);
                    console.log("End Get Jobs", currentJobsID.join(' '))
                    if (newJobs.length > 0) {
                        try {
                            await jobsCollection.insertMany(newJobs)
                            for (let job of newJobs) {
                                console.log("save log", job.id)
                                await saveLog(job.id)
                                console.log("end save log", job.id)
                            }
                            job.attrs.data = {index: count, total: nbBuilds}
                            await job.save();
                        } catch (error) {
                            // ignore
                            console.log(error)
                        }
                    }
                    currentJobsID = []
                }
            }
            count++;
            job.attrs.data = {index: count, total: nbBuilds}
            await job.save();
        }
        if (currentJobsID.length > 0) {
            const savedJobs = await jobsBuildsaverCollection.find({$or: currentJobsID.map(id => {return {id: id}})}).toArray()

            const newJobs = await getNewJobs(savedJobs);
            if (currentJobsID.length > 0) {
                try {
                    await jobsCollection.insertMany(newJobs)
                } catch (error) {
                    // ignore
                }
                for (let job of newJobs) {
                    await saveLog(job.id)
                }
            }
        }
        job.attrs.data = {index: count, total: nbBuilds}
        await job.save();
    });
};