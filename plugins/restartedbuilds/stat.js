async function getChangedState(buildsCollection) {
    const query = [
        {
            '$group': {
                '_id': {
                    'old': '$old.state', 
                    'new': '$new.state'
                }, 
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

async function getDayOfWeek(buildsCollection) {
    const query = [
        {
            '$project': {
                _id: '$_id',
                dayOfWeek: { $dayOfWeek: "$new.started_at" },
            }
        },
        {
            '$group': {
                '_id': '$dayOfWeek', 
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

async function getHours(buildsCollection) {
    const query = [
        {
            '$project': {
                _id: '$_id',
                hours: { $hour: "$new.started_at" },
            }
        },
        {
            '$group': {
                '_id': '$hours', 
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

async function perDay(buildsCollection, dateField) {
    dateField = dateField || "$new.started_at";
    const query = [
        {
            '$project': {
                yearMonthDay: { $dateToString: { format: "%Y-%m-%d", date: dateField } }
            }
        },
        {
            '$group': {
                '_id': '$yearMonthDay', 
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

async function getErrorTypes(collection) {
    const query = [
        {
          '$unwind': {
            'path': '$reasons', 
            'preserveNullAndEmptyArrays': false
          }
        }, {
          '$group': {
            '_id': {
              'reason': '$reasons', 
              'state': '$restarted_state'
            }, 
            'count': {
              '$sum': 1
            }
          }
        }, {
          '$sort': {
            'count': -1
          }
        }
      ]

    const result = await collection.aggregate(query).toArray()
    const output = {}
    for (let r of result) {
        if (output[r._id.reason] == null) {
            output[r._id.reason] = {}
        }
        output[r._id.reason][r._id.state] = r.count;
    }
    return output;
}

async function isPullRequest(buildsCollection) {
    const query = [
        {
            '$group': {
                '_id': '$old.pull_request', 
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

module.exports.stat = async function (buildsCollection, jobsCollection, logsCollection, originalBuildsCollection, reasonsCollection) {
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

    promises.push(isPullRequest(buildsCollection))
    labels.push('prs')

    promises.push(getCount(buildsCollection))
    labels.push('nb_restarted_builds')

    promises.push(getCount(jobsCollection))
    labels.push('nb_restarted_jobs')

    promises.push(perDay(buildsCollection))
    labels.push('perDay')

    promises.push(perDay(buildsCollection, "$old.started_at"))
    labels.push('restartedPerDay')

    promises.push(perDay(originalBuildsCollection, "$started_at"))
    labels.push('originalPerDay')

    // promises.push(getDayOfWeek(buildsCollection))
    // labels.push('dayOfWeek')

    // promises.push(getHours(buildsCollection))
    // labels.push('hours')

    promises.push(getErrorTypes(reasonsCollection))
    labels.push('errorTypes')

    const results = await Promise.all(promises);
    const output = {};
    for (let i =0; i < results.length; i++) {
        output[labels[i]] = results[i]
    }
    return output;
}