const request = require('request');

module.exports = function(agenda, restartedDB, buildsaverDB) {
    const buildsCollection = restartedDB.collection('builds')
    async function getBuildsFromIds(buildIds) {
        return new Promise((resolve, reject) => {
            request.get('http://listener/api/builds?id=' + buildIds.join(','), {timeout: 20000}, function (err, res, body) {
                if (err) {
                    return reject(err);
                }
                const items = JSON.parse(body);
                items.forEach(i => {
                    if (i.started_at) {
                        i.started_at = new Date(i.started_at)
                    }
                    if (i.updated_at) {
                        i.updated_at = new Date(i.updated_at)
                    }
                    if (i.finished_at) {
                        i.finished_at = new Date(i.finished_at)
                    }
                });
                resolve(items);
            })
        });
    };

    async function getNewBuild(builds) {
        const restartedBuilds = []
        const buildObj = {};
        for (let build of builds) {
            if (build.config && build.config['.result']) {
                build.config.result = build.config['.result']
                delete build.config['.result'];
            }
            buildObj[build.id] = build
        }
        let newBuilds = []
        try {
            newBuilds = await getBuildsFromIds(Object.keys(buildObj));
        } catch (e) {
            console.error("Unable to get get builds", e)
            newBuilds = await getBuildsFromIds(Object.keys(buildObj));
        }
        for (let build of newBuilds) {
            delete build.commit;
            
            if (buildObj[build.id].started_at < build.started_at && build.state != 'started') {
                restartedBuilds.push({
                    id: build.id,
                    wait_time: build.started_at - buildObj[build.id].started_at,
                    old: buildObj[build.id],
                    new: build
                });
            }
        }
        return restartedBuilds;
    }

    agenda.define('fetch restarted builds', {concurrency: 1}, async job => {
        const maxRequest = 250

        let currentRequest = []
        const cursor = buildsaverDB.collection('builds').find({$and: [{started_at: {$gt: new Date(new Date().setDate(new Date().getDate()-30))}}, {$or: [{state: 'errored'}, {state: 'failed'}, {state: 'canceled'}, {state: 'passed'}]}]}).sort( { _id: 1 } );
        const nbBuild = await cursor.count()
        let count = 0
        let countRestarted = 0

        job.attrs.progression = {index: count, total: nbBuild, countRestarted}
        await job.save();

        while ((build = await cursor.next())) {
            count++;
            const current = await buildsCollection.findOne({id: build.id});
            if (current != null) {
                continue;
            }
            currentRequest.push(build)
            if (currentRequest.length >= maxRequest) {
                const newBuilds = await getNewBuild(currentRequest);
                await job.touch();
                if (newBuilds.length > 0) {
                    countRestarted += newBuilds.length
                    try {
                        await buildsCollection.insertMany(newBuilds)
                        await job.touch();
                    } catch (error) {
                        // ignore
                        console.error(error)
                    }
                }
                currentRequest = []
                job.attrs.progression = {index: count, total: nbBuild, countRestarted}
                await job.save();
            }
        }
        if (currentRequest.length > 0) {
            const newBuilds = await getNewBuild(currentRequest);
            if (newBuilds.length > 0) {
                countRestarted += newBuilds.length
                console.log('Restarted builds:', countRestarted)
                try {
                    await buildsCollection.insertMany(newBuilds)
                    await job.touch();
                } catch (error) {
                    // ignore
                    console.error(error)
                }
            }
        }
        job.attrs.progression = {index: count, total: nbBuild, countRestarted}
        await job.save();
    });
};
