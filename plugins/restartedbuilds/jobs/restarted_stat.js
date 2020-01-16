module.exports = function(agenda, db, buildsaverDB) {
    const logCollection = db.collection('logs')
    const reasonsCollection = db.collection('reasons')
    const jobCollection = db.collection('jobs')

    async function process(input) {
        const result = new Set()
        const reason_types = new Set()
        if (input.analysis.original.reasons.length == 0) {
            return
        }
        for (let reason of input.analysis.original.reasons) {
            if (reason.failure_group){
                result.add(reason.failure_group);
            } else if (reason.failure_failure_group){
                result.add(reason.failure_failure_group);
            }
            if (reason.type){
                reason_types.add(reason.type);
            }
        }
        
        const job = await jobCollection.findOne({id: input.id}, {projection: {'new.state': 1, 'old.state': 1, 'old.language': 1}})
        const data = {
            id: input.id, 
            reasons: Array.from(result), 
            reason_types: Array.from(reason_types), 
            'restarted_state': job.new.state, 
            'original_state': job.old.state, 
            'language': job.old.language
        };
        try {
            await reasonsCollection.updateOne({id: data.id}, {$set: data}, {upsert: true})
        } catch (error) {
            console.error(error)   
        }
    }

    agenda.define('generate restarted reasons', {concurrency: 1}, async job => {
        let count = 0;
        // const checked = new Set()
        // await reasonsCollection.find({}, {projection: {id: 1}}).forEach(r => checked.add(r.id));
        const cursor = logCollection.find({"analysis.original.reasons.0": {$exists: true}}, {projection: {id: 1, 'analysis.original.reasons.type': 1, 'analysis.original.reasons.failure_group': 1, 'analysis.original.reasons.failure_failure_group': 1}});
        const nbLogs = await cursor.count()
        
        while (await cursor.hasNext()) {
            await job.touch();
            count++;
            const reason = await cursor.next();
            // if (checked.has(reason.id)) {
            //     continue;
            // }
            console.log('[Reason] ' + reason.id);
            try {
                await process(reason);
            } catch (error) {
                console.log(error);
            }

            job.attrs.progression = {index: count, total: nbLogs}
            await job.save();
        }
    });
};