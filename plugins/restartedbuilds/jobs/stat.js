const request = require('request')
const async = require('async');

module.exports = function(agenda, db, buildsaverDB) {
    const logCollection = buildsaverDB.collection('reasons')
    const reasonsCollection = buildsaverDB.collection('stat')
    const jobCollection = buildsaverDB.collection('jobs')

    async function process(input) {
        const result = new Set()
        if (input.reasons.length == 0) {
            return
        }
        for (let reason of input.reasons) {
            result.add(reason.type);
        }
        
        const job = await jobCollection.findOne({id: input.id}, {projection: {'state': 1}})
        const data = {id: input.id, reasons: Array.from(result), 'state': job.state};
        try {
            await reasonsCollection.insertOne(data)
        } catch (error) {
            console.error(error)   
        }
    }

    agenda.define('generate reasons', {concurrency: 1}, async job => {
        let count = 0;
        console.log("start query")
        const checked = new Set()
        await reasonsCollection.find({}, {projection: {id: 1}}).forEach(r => checked.add(r.id));
        const cursor = logCollection.find({"reasons.0": {$exists: true}}, {projection: {id: 1, 'reasons.type': 1}});
        const nbLogs = await cursor.count()
        
        console.log("start process")
        
        while (await cursor.hasNext()) {
            await job.touch();
            count++;
            const reason = await cursor.next();
            if (checked.has(reason.id)) {
                continue;
            }
            console.log('[Reason] ' + reason.id);
            try {
                await process(reason);
            } catch (error) {
                console.log(error);
            }

            job.attrs.progression = {index: count, total: nbLogs}
            await job.save();
            
            checked.add(reason.id)
        }
    });
};