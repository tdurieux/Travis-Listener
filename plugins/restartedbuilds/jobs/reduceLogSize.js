const request = require('request')

module.exports = function(agenda, restartedDB, buildsaverDB) {
    const logCollection = restartedDB.collection('logs')

    const logBuildsaverCollection = buildsaverDB.collection('logs')


    agenda.define('reduceLogSize', {concurrency: 1}, async job => {
        const cursor = logBuildsaverCollection.find();

        const nbLogs = await cursor.count()
        let count = 0
        const checked = new Set()
        
        while ((restartedLog = await cursor.next())) {
            await job.touch();
            count++;
            job.attrs.progression = {index: count, total: nbLogs}
            await job.save();
            if (checked.has(restartedLog.id)) {
                continue
            }
            await new Promise((resolve) => {
                request.post('http://logparser/api/clean', {
                    timeout: 45000,
                    body: {log: restartedLog.log},
                    json: true
                }, async function (err, t, body) {
                    if (!err) {
                        restartedLog.log = body
                        await logBuildsaverCollection.updateOne({_id: restartedLog._id}, {$set: restartedLog}, {upsert: true})
                    }
                    resolve();
                });
            })

            checked.add(restartedLog.id)
            await job.touch();
        }
    });
};