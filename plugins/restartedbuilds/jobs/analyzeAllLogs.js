const request = require('request')

module.exports = function(agenda, db, buildsaverDB) {
    const logCollection = buildsaverDB.collection('logs')
    const reasonsCollection = buildsaverDB.collection('reasons')


    agenda.define('analyze all jobs', {concurrency: 1}, async job => {
        const cursor = logCollection.find();

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
            const oldReason = await reasonsCollection.findOne({id: restartedLog.id});
            if (oldReason) {
                continue;
            }
            const output = await new Promise((resolve) => {
                    request.post('http://logparser/api/analyze', {
                    timeout: 45000,
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
        }
    });
};