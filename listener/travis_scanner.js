const Travis = require('travis-ci');
const async = require('async');
const EventEmitter = require('events');

class ItemEmitter extends EventEmitter {}
const itemEmitter = new ItemEmitter();

let unfinishedBuilds = {};
let unfinishedJobs = {};

const travis = new Travis({
    version: '2.0.0'
});

function cleanGitHubObj(obj) {
    if (typeof obj !== 'object') {
        return obj;
    }
    for (let key in obj) {
        if (key.indexOf('.') > -1) {
            obj[key.replace(/\./g, '')] = obj[key]
            delete obj[key]
            key = key.replace(/\./g, '')
        }
        if (obj[key] == null) {
            continue;
        }

        if (obj[key].started_at) {
            obj[key].started_at = new Date(obj[key].started_at)
        }
        if (obj[key].updated_at) {
            obj[key].updated_at = new Date(obj[key].updated_at)
        }
        if (obj[key].finished_at) {
            obj[key].finished_at = new Date(obj[key].finished_at)
        }
        if (key.indexOf('url') > -1) {
            delete obj[key]
        } else {
            obj[key] = cleanGitHubObj(obj[key])
        }
    }
    return obj
}

function generateIds(minId, number, reverse) {
    if (reverse == null) {
        reverse = false;
    }
    const output = [];
    while(number >= 0) {
        if (reverse) {
            output.push(--minId);
        } else {
            output.push(++minId);
        }
        number--;
    }
    return output;
}
const timeout = ms => new Promise(res => setTimeout(res, ms))

function isFinished(build) {
    return build.state == "errored" || build.state == "canceled" || build.state == "failed" || build.state == "passed";
}

/**
 * @param itemIds []
 * @returns {Promise<*[]>}
 */
async function getBuildsFromIds(itemIds) {
    return getItemFromIds(getBuilds, itemIds);
}
/**
 * @param itemIds []
 * @returns {Promise<*[]>}
 */
async function getJobsFromIds(itemIds) {
    return getItemFromIds(getJobs, itemIds);
}

async function getItemFromIds(func, itemIds) {
    return func('?ids[]=' + itemIds.join('&ids[]='));
}

async function getItems(func, query) {
    return new Promise((resolve, reject) => {
        func(query + "&random=" + Math.random()).get((err, data) => {
            if (err) {
                return reject(err);
            }
            let items = data.builds;
            if (data.jobs) {
                items = data.jobs;
            }
            const commits = data.commits;

            for(let i in items) {
                items[i].commit = commits[i];
                items[i] = cleanGitHubObj(items[i]);
                items[i].branch = items[i].commit.branch;
            }
            return resolve(items);
        });
    });
};

/**
 * @param query
 * @returns {Promise<[]>}
 */
async function getJobs(query) {
    return getItems(travis.jobs, query)
}

/**
 * @param query
 * @returns {Promise<[]>}
 */
async function getBuilds(query) {
    return getItems(travis.builds, query)
}

async function getLatestJobs() {
    return getJobs("?state=created");
}

async function scan(opt) {
    opt = Object.assign({}, {
        items: 220,
        wait: 250,
        scanUnfinished: true
    }, opt);

    if (opt.scanUnfinished) {
        scanUnfinished(opt)
    }
    const jobs = await getLatestJobs();

    let maxJobId = Math.max.apply(Math, jobs.map(j => j.id))
    let maxBuildId = Math.max.apply(Math, jobs.map(j => j.build_id))

    async.forever(async () => {
        try {
            let buildIds = generateIds(maxBuildId, opt.items);
            let jobIds = generateIds(maxJobId, opt.items);
            try {
                const values = await Promise.all([getBuildsFromIds(buildIds), getJobsFromIds(jobIds)])
                values[0].forEach(j => {
                    itemEmitter.emit('build', j)
                    if (isFinished(j) == false) {
                        unfinishedBuilds[j.id] = j
                    }
                });
                values[1].forEach(j => {
                    itemEmitter.emit('job', j)
                    if (isFinished(j) == false) {
                        unfinishedJobs[j.id] = j
                    }
                });
                buildIds = values[0].map(j => j.id);
                buildIds.push(maxBuildId);
                maxBuildId = Math.max(...buildIds);

                jobIds = values[1].map(j => j.id);
                jobIds.push(maxJobId);
                maxJobId = Math.max(...jobIds);
                
                await timeout(opt.wait);
            } catch (e) {
                await timeout(30000);
            }
        } catch (e) {
            console.error("Error", e);
        }
    }, error => {
        console.error("Error forever", error);
    });
}

function checkUnfinished(unfinishedItems, func, prefix) {
    return getUnfinished(unfinishedItems, func, items => {
        items.forEach(item => {
            const oldItem = unfinishedItems[item.id]
            const oldStart = oldItem.started_at;
            if (oldStart != null && item.started_at != oldStart) {
                console.log("Restarted", item.id, unfinishedItems[item.id].state, item.state, oldStart, item.started_at);
                itemEmitter.emit(prefix + "_restarted", item);

            }
            const oldState = unfinishedItems[item.id].state;
            unfinishedItems[item.id] = item;
            if (oldStart != null) {
                unfinishedItems[item.id].started_at = oldStart
            }
            if(!isFinished(item)) {
                if (oldState != item.state) {
                    itemEmitter.emit(prefix + "_updated", unfinishedItems[item.id]);
                }
                return;
            } else if (unfinishedItems[item.id] != null) {
                // update state
                itemEmitter.emit(prefix + "_finished", unfinishedItems[item.id]);
                itemEmitter.emit(prefix + "_updated", unfinishedItems[item.id]);
                delete unfinishedItems[item.id];
            }
        });
    });
}

function scanUnfinished(opt) {
    async.forever(async _ => {
        try {
            console.log('start unfinishedBuilds', Object.keys(unfinishedBuilds).length)
            await checkUnfinished(unfinishedBuilds, getBuildsFromIds, 'build')
        } catch (error) {
            console.error(error)
        }
    })
    async.forever(async _ => {
        try {
            console.log('start unfinishedJobs', Object.keys(unfinishedJobs).length)
            await checkUnfinished(unfinishedJobs, getJobsFromIds, 'job')   
        } catch (error) {
            console.error(error)
        }
        // await timeout(opt.wait)
    });
}

/**
 *
 * @returns {Promise<[]>}
 */
async function getUnfinished(unfinishedItems, func, progress) {
    return new Promise(resolve => {
        const sortable = Object.keys(unfinishedItems);

        sortable.sort(function (a, b) {
            return new Date(unfinishedItems[b].started_at) - new Date(unfinishedItems[a].started_at);
        });

        if (sortable.length === 0) {
            return setTimeout(_=>{resolve([])}, 2000);
        }

        const requestPerPage = 75;
        const nbParallel = 4;

        let results = [];
        async.timesLimit(Math.ceil(sortable.length/requestPerPage), nbParallel, async i => {
            const updatedBuilds = await func(sortable.slice(i * requestPerPage, i*requestPerPage + requestPerPage));
            console.log(i * requestPerPage, i*requestPerPage + requestPerPage, sortable.slice(i * requestPerPage, i*requestPerPage + requestPerPage).length, updatedBuilds.length)
            if (progress) {
                progress(updatedBuilds);
            }
            results = results.concat(updatedBuilds);
        }, (err, values) => {
            resolve(results);
        });
    });
}

module.exports.scan = scan;
module.exports.getBuildsFromIds = getBuildsFromIds;
module.exports.getJobsFromIds = getJobsFromIds;
module.exports.getLatestJobs = getLatestJobs;
module.exports.emitter = itemEmitter;
