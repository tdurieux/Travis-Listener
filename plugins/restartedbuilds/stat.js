async function getChangedState(buildsCollection) {
    const query = [
        {
            '$group': {
                '_id': {
                    'old': '$old.state', 
                    'new': '$new.state'
                }, 
                'items': {
                    '$addToSet': '$id'
                }
            }
        }, {
            '$unwind': {
                'path': '$items', 
                'preserveNullAndEmptyArrays': false
            }
            }, {
            '$group': {
                '_id': '$_id', 
                'countItem': {
                    '$sum': 1
                }
            }
        }, {
            '$sort': {
                'countItem': -1
            }
        }
    ]

    const result = await buildsCollection.aggregate(query).toArray()
    const output = {}
    for (let r of result) {
        if (output[r._id.old] == null) {
            output[r._id.old] = {}
        }
        output[r._id.old][r._id.new] = r.countItem;
    }
    return output;
}

async function getChangedLanguages(buildsCollection) {
    const query = [
        {
            '$group': {
                '_id': '$old.language', 
                'items': {
                    '$addToSet': '$id'
                }
            }
        }, {
            '$unwind': {
                'path': '$items', 
                'preserveNullAndEmptyArrays': false
            }
            }, {
            '$group': {
                '_id': '$_id', 
                'countItem': {
                    '$sum': 1
                }
            }
        }, {
            '$sort': {
                'countItem': -1
            }
        }
    ]

    const result = await buildsCollection.aggregate(query).toArray()
    const output = {}
    for (let r of result) {
        output[r._id] = r.countItem;
    }
    return output;
}

async function getRepositories(buildsCollection) {
    const query = [
        {
            '$group': {
                '_id': '$old.repository_id', 
                'items': {
                    '$addToSet': '$id'
                }
            }
        }, {
            '$unwind': {
                'path': '$items', 
                'preserveNullAndEmptyArrays': false
            }
            }, {
            '$group': {
                '_id': '$_id', 
                'countItem': {
                    '$sum': 1
                }
            }
        }, {
            '$sort': {
                'countItem': -1
            }
        }
    ]

    const result = await buildsCollection.aggregate(query).toArray()
    const output = {}
    for (let r of result) {
        output[r._id] = r.countItem;
    }
    return output;
}

async function getEventType(buildsCollection) {
    const query = [
        {
            '$group': {
                '_id': '$old.event_type', 
                'items': {
                    '$addToSet': '$id'
                }
            }
        }, {
            '$unwind': {
                'path': '$items', 
                'preserveNullAndEmptyArrays': false
            }
            }, {
            '$group': {
                '_id': '$_id', 
                'countItem': {
                    '$sum': 1
                }
            }
        }, {
            '$sort': {
                'countItem': -1
            }
        }
    ]

    const result = await buildsCollection.aggregate(query).toArray()
    const output = {}
    for (let r of result) {
        output[r._id] = r.countItem;
    }
    return output;
}

async function getCount(collection) {
    return await collection.count()
}

module.exports.stat = async function (buildsCollection, jobsCollection) {
    const labels = []
    const promises = []
    promises.push(getChangedState(buildsCollection))
    labels.push('states')

    promises.push(getChangedLanguages(buildsCollection))
    labels.push('languages')

    promises.push(getRepositories(buildsCollection))
    labels.push('repositories')

    promises.push(getEventType(buildsCollection))
    labels.push('events')

    promises.push(getCount(buildsCollection))
    labels.push('nb_restarted_builds')

    promises.push(getCount(jobsCollection))
    labels.push('nb_restarted_jobs')

    const results = await Promise.all(promises);
    const output = {};
    for (let i =0; i < results.length; i++) {
        output[labels[i]] = results[i]
    }
    return output;
}