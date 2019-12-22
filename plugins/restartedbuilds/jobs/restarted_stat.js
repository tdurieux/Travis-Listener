const request = require('request')
const async = require('async');

module.exports = function(agenda, db, buildsaverDB) {
    const logCollection = db.collection('logs')
    const reasonsCollection = db.collection('reasons')
    const jobCollection = db.collection('jobs')

    async function process(input) {
        const result = new Set()
        if (input.analysis.original.reasons.length == 0) {
            return
        }
        for (let reason of input.analysis.original.reasons) {
            result.add(reason.type);
        }
        
        const job = await jobCollection.findOne({id: input.id}, {projection: {'new.state': 1, 'old.state': 1, 'old.language': 1}})
        const data = {
            id: input.id, 
            reasons: Array.from(result), 
            'restarted_state': job.new.state, 
            'original_state': job.old.state, 
            'language': job.old.language
        };
        try {
            await reasonsCollection.insertOne(data)
        } catch (error) {
            console.error(error)   
        }
    }

    agenda.define('generate restarted reasons', {concurrency: 1}, async job => {
        let count = 0;
        console.log("start query")
        const checked = new Set()
        await reasonsCollection.find({}, {projection: {id: 1}}).forEach(r => checked.add(r.id));
        const cursor = logCollection.find({"analysis.original.reasons.0": {$exists: true}}, {projection: {id: 1, 'analysis.original.reasons.type': 1}});
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