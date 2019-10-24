const express = require('express')
const WebSocket = require('ws');
const MongoClient = require('mongodb').MongoClient;
const request = require('request')
const stripAnsi = require('strip-ansi');

const client = new MongoClient("mongodb://mongo:27017", {useNewUrlParser: true, useUnifiedTopology: true});

const app = express();

var port = process.env.PORT || 4000;

function cleanGitHubObj(obj) {
    if (typeof obj !== 'object') {
        return obj
    }
    for (let key in obj) {
        if (key.indexOf('url') > -1) {
            delete obj[key]
        } else {
            obj[key] = cleanGitHubObj(obj[key])
        }
    }
    return obj
}

async function connect (err) {
    if (err) {
        setTimeout(() => {
            client.connect(connect);
        }, 1000)
        return;
    }
    console.log("Connected successfully to server", err);
    
    const db = client.db("buildsaver");
    db.createCollection( "builds")
    db.createCollection( "jobs")
    db.createCollection( "commits")
    db.createCollection( "repositories")
    db.createCollection( "users")
    db.createCollection( "unknown_users")
    db.createCollection( "logs")
    const buildsCollection = db.collection('builds')
    
    const jobsCollection = db.collection('jobs')
    const commitsCollection = db.collection('commits')
    const repositoriesCollection = db.collection('repositories')
    const usersCollection = db.collection('users')
    const logCollection = db.collection('logs')
    const unknownUsersCollection = db.collection('unknown_users')

    jobsCollection.createIndex('id', {unique: true})
    commitsCollection.createIndex('id', {unique: true})
    commitsCollection.createIndex('sha', {unique: true})
    repositoriesCollection.createIndex('id', {unique: true})
    
    usersCollection.createIndex('id', {unique: true})
    buildsCollection.createIndex('id', {unique: true})
    unknownUsersCollection.createIndex(['author_email', 'author_name', 'committer_email', 'committer_name'], {unique: true})
    try {
        await logCollection.createIndex('id', {unique: true})
    } catch (error) {}
    

    function findUser(committer_name, author_name, author_email, committer_email) {
        return new Promise((resolve, reject) => {
            usersCollection.findOne({$or: [{'email': author_email}, {'email': committer_email}, {'name': committer_name}, {'name': author_name}]}, function (err, result) {
                if (result != null) {
                    return resolve(result.id);
                }
                unknownUsersCollection.findOne({$or: [{'author_email': author_email}, {'committer_email': committer_email}, {'author_name': author_name}, {'committer_name': committer_name}]}, function (err, result) {
                    if (result == null) {
                        unknownUsersCollection.insertOne({
                            'author_name': author_name,
                            'author_email': author_email,
                            'committer_name': committer_name,
                            'committer_email': committer_email
                        }, (err) => {
                            if (err) {
                                // ignore
                                return
                            }
                        })
                    }
                });
                if (Math.random() < 0.05) {
                    request('http://github/search/users?q=' + author_name, function (err, resp, body) {
                        if (body != null && body.length > 0 && body[0] == '{') {
                            body = JSON.parse(body)
                            if (body.total_count > 0) {
                                body = body.items[0]
                                saveUser(body.id)
                                return resolve(body.id);
                            }
                        }
                        return resolve(null);
                    });
                } else {
                    return resolve(null);
                }
            })
        })
    }
    function saveLog(jobId) {
        logCollection.findOne({"id": jobId}, function (err, result) {
            if (!err && !result) {
                request('https://api.travis-ci.org/jobs/' + jobId + '/log', function (err, resp, body) {
                    if (body != null && body.length > 0) {
                        if (body[0] == '{') {
                            console.log(body)
                        }
                        // body = stripAnsi(body)
                        logCollection.insertOne({
                            id: jobId,
                            log: body
                        })
                    }
                })
            }
        });
    }
    function saveUser(userId) {
        usersCollection.findOne({"id": userId}, function (err, result) {
            if (!err && !result) {
                request('http://github/user/' + userId, function (err, resp, body) {
                    if (body != null && body.length > 0 && body[0] == '{') {
                        body = cleanGitHubObj(JSON.parse(body))
                        if (body.created_at) {
                            body.created_at = new Date(body.created_at)
                        }
                        if (body.updated_at) {
                            body.updated_at = new Date(body.updated_at)
                        }
                        if (body.id) {
                            usersCollection.insertOne(body, (err) => {
                                if (err) {
                                    // ignore
                                    return
                                }
                            })
                        }
                    }
                })
            }
        });
    }
    function saveRepo(repositoryId) {
        repositoriesCollection.findOne({"id": repositoryId}, function (err, result) {
            if (!err && !result) {
                request('http://github/repositories/'+repositoryId, function (err, resp, body) {
                    if (body != null && body.length > 0 && body[0] == '{') {
                        body = cleanGitHubObj(JSON.parse(body))
                        if (body.created_at) {
                            body.created_at = new Date(body.created_at)
                        }
                        if (body.updated_at) {
                            body.updated_at = new Date(body.updated_at)
                        }
                        if (body.pushed_at) {
                            body.created_at = new Date(body.created_at)
                        }
                        if (body.owner) {
                            saveUser(body.owner.id);
                        }
                        if (body.id) {
                            repositoriesCollection.insertOne(body, (err) => {
                                if (err) {
                                    // ignore
                                    return
                                }
                            })
                        }
                    }
                }) 
            }
        })
    }
    function incomingMessage (data) {
        if (data[0] == '{') {
            data = JSON.parse(data);
            if (data.data.finished_at) {
                data.data.finished_at = new Date(data.data.finished_at)
            }
            if (data.data.started_at) {
                data.data.started_at = new Date(data.data.started_at)
            }
            if (data.data.repository_id) {
                saveRepo(data.data.repository_id)
            }
            if (data.data.commit) {
                const commit = data.data.commit;
                if (commit.committed_at) {
                    commit.committed_at = new Date(commit.committed_at)
                }
                data.data.commit = commit.sha;
                
                commitsCollection.findOne({"sha": commit.sha}, function (err, result) {
                    if (!err && !result) {
                        findUser(commit.committer_name, commit.author_name, commit.author_email, commit.committer_email).then(userId => {
                            commit.user_id = userId
                            commitsCollection.insertOne(commit, (err) => {
                                if (err) {
                                    // ignore
                                    return
                                }
                            });
                        })
                    }
                })
            }
            if (data.data.config.language) {
                data.data.language = data.data.config.language
            }
            if (data.event == 'build') {
                const build = data.data
                buildsCollection.insertOne(build, (err, result) => {
                    if (err) {
                        delete build._id;
                        buildsCollection.updateOne({id: build.id}, {$set: build}, {upsert: true})
                    }
                })
            }
            if (data.event == 'build_updated') {
                const build = data.data
                buildsCollection.updateOne({id: build.id}, {$set: build}, {upsert: true})
            }
            if (data.event == 'job') {
                const job = data.data
                if (job.state == "failed" || job.state == "errored") {
                    saveLog(job.id);
                }
                jobsCollection.insertOne(job, (err, result) => {
                    if (err) {
                        delete job._id;
                        jobsCollection.updateOne({id: job.id}, {$set: job}, {upsert: true}, (err, result) => {
                            if (err) {
                                console.log(err, job)
                            }
                        })
                    }
                })
            }
            if (data.event == 'job_updated') {
                const job = data.data
                if (job.state == "failed" || job.state == "errored") {
                    saveLog(job.id);
                }
                jobsCollection.updateOne({id: job.id}, {$set: job}, {upsert: true})
            }
        }
    };

    function startListenerConnection() {
        try {
            const wsClient = new WebSocket('ws://listener');
            wsClient.on('error', function(){
                return setTimeout(startListenerConnection, 100);
            })
            wsClient.on('message', incomingMessage);
            var that = this;
            wsClient.on('open', function(){
                console.log("Connect to listener")
                that.isAlive = true;
            })
            wsClient.on('ping', function(){
                that.isAlive = true;
            })
            wsClient.on('close', function(){
                that.isAlive = false;
                // Try to reconnect in 5 seconds
                return setTimeout(startListenerConnection, 5000);
            });
        } catch (e) {
            return setTimeout(startListenerConnection, 100);
        }
    }
    console.log("here")
    startListenerConnection();
  
    // client.close();
}

client.connect(connect);

