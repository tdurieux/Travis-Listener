const request = require('request')
const async = require('async');

module.exports = function(agenda, db, buildsaverDB) {
    const logCollection = buildsaverDB.collection('logs')
    const reasonsCollection = buildsaverDB.collection('reasons')


    agenda.define('analyze all jobs', {concurrency: 1}, async job => {
        const cursor = logCollection.find({}).skip(426975);

        const nbLogs = await cursor.count()
        let count = 0
        const checked = new Set()
        await new Promise((resolve) => {
            async.eachLimit(cursor, 5, async (restartedLog) => {
                await job.touch();
                count++;
                job.attrs.progression = {index: count, total: nbLogs}
                await job.save();
                if (checked.has(restartedLog.id)) {
                    return;
                }
                const oldReason = await reasonsCollection.findOne({id: restartedLog.id});
                if (oldReason) {
                    return;
                }
                console.log(restartedLog.id)
                const output = await new Promise((resolve) => {
                        request.post('http://logparser/api/analyze', {
                        body: {log: restartedLog.log},
                        json: true
                    }, function (err, t, body) {
                        resolve(body);
                    });
                });
    
                if (output != null) {
                    output.id = restartedLog.id;
                    await reasonsCollection.insertOne(output);
                }
    
                checked.add(restartedLog.id)
                await job.touch();
            }, resolve);
        })
    });
};