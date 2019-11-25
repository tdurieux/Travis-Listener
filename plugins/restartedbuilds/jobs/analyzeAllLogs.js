const request = require('request')
const async = require('async');

module.exports = function(agenda, db, buildsaverDB) {
    const logCollection = buildsaverDB.collection('logs')
    const reasonsCollection = buildsaverDB.collection('reasons')

    async function process(restartedLog) {
        const oldReason = await reasonsCollection.findOne({id: restartedLog.id}, {_id: 1});          
        if (oldReason) {
            return 0;
        }
        const output = await new Promise((resolve) => {
                request.post('http://logparser/api/analyze', {
                timeout: 1000,
                body: {log: restartedLog.log},
                json: true
            }, function (err, t, body) {
                resolve(body);
            });
        });

        if (output != null) {
            output.id = restartedLog.id;
            try {
                console.log("Insert log")
                await reasonsCollection.insertOne(output);    
            } catch (error) {
                console.log(error)
            }
            if (output.reasons.length > 0) {
                return 1;
            }
        }
        return 0;
    }

    agenda.define('analyze all jobs', {concurrency: 1}, async job => {
        let count = 0;
        let hasFailure = 0;
        console.log("start query")
        const checked = new Set()
        await reasonsCollection.find({}, {id: 1}).forEach(r => checked.add(r.id));
        const cursor = logCollection.find({}, {id: 1, log: 1});
        const nbLogs = await cursor.count()
        
        console.log("start process")
        

        while (await cursor.hasNext()) {
            await job.touch();
            count++;
            const log = await cursor.next();
            if (checked.has(log.id)) {
                continue;
            }
            console.log('[ALog] log ' + log.id);
            try {
                hasFailure += await process(log);
            } catch (error) {
                console.log(error);
            }

            job.attrs.progression = {index: count, total: nbLogs, nbFailures: hasFailure}
            await job.save();
            
            checked.add(log.id)
        }
    });
};