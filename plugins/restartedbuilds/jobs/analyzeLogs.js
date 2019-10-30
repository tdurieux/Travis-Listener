const request = require('request')

module.exports = function(agenda, restartedDB, buildsaverDB) {
    const logCollection = restartedDB.collection('logs')

    const logBuildsaverCollection = buildsaverDB.collection('logs')


    agenda.define('analyze jobs', {concurrency: 1}, async job => {
        const cursor = logCollection.find({$or: [{'analysis.original.reasons': {$exists: false}}, {'analysis.original.reasons': {$size: 0}}]}).sort({_id: -1});

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
            const oldLog = await logBuildsaverCollection.findOne({id: restartedLog.id});
            const output = await new Promise((resolve) => {
                    request.post('http://logparser/api/diff', {
                    timeout: 45000,
                    body: {new: restartedLog.log, old: oldLog.log},
                    json: true
                }, function (err, t, body) {
                    resolve(body);
                });
            });

            if (output != null) {
                restartedLog.analysis = output.analysis;
                restartedLog.logDiff = output.logDiff;

                await logCollection.updateOne({id: restartedLog.id}, {$set: restartedLog}, {upsert: true})
            }

            checked.add(restartedLog.id)
            await job.touch();
        }
    });
};