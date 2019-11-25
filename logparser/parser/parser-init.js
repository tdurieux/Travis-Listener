const stripAnsi = require('strip-ansi');
const Parser = require('./Parser').Parser;
const JavaParser = require('./javaParser').Parser;
const JsParser = require('./npmParser').Parser;
const PyParser = require('./pythonParser').Parser;
const ObjcParser = require('./objcParser').Parser;
const PhpParser = require('./phpParser').Parser;
const GoParser = require('./goParser').Parser;
const RubyParser = require('./rubyParser').Parser;
const GenericParser = require('./genericParser').Parser;

const startWith = require('../clean_log').startWith

const fold_start = new RegExp("travis_fold:start:(.*)");
const fold_end = new RegExp("travis_fold:end:(.*)");

async function parseLog(log) {
    if (log == null) {
        return null;
    }
    return new Promise(async (resolve, reject) => {
        const job = {}
        try {
            /**
             * @type {Parser[]}
             */
            const parsers = [new JavaParser(), new JsParser(), new PyParser(), new ObjcParser(), new PhpParser(), new RubyParser(), new GoParser(), new GenericParser()];

            let exitCode = null;

            let tool = null;
            let tests = [];
            let errors = [];
            let commit = null;

            let lineStart = 0;
            line: for (let i = 0; i < log.length; i++) {
                if (i == log.length - 1 || log[i] == '\n') {                    
                    let line = log.slice(lineStart, i);

                    lineStart = i + 1;
                    if (line.length === 0) {
                        continue;
                    }
                    for (let property of startWith) {
                        if (line.indexOf(property) > -1) {
                            continue line;
                        }
                    }


                    if ((!job.config || !job.config.language) && line.indexOf("Build language: ") == 0) {
                        if (!job.config) {
                            job.config = {};
                        }
                        job.config.language = line.replace("Build language: ", "");
                    } else if (line.indexOf("$ git checkout -qf ") != -1) {
                        commit = (line.replace("$ git checkout -qf ", ''))
                    } else if (line.indexOf("git fetch origin ") != -1) {
                        //console.log(line)
                    } else if (line.indexOf("Done. Your build exited with ") != -1) {
                        exitCode = parseInt(line.substring("Done. Your build exited with ".length, line.length -1));
                    } else if (line.indexOf("fatal: Could not read from remote repository.") != -1)  {
                        errors.push({
                            type: 'Unable to clone'
                        })
                    } else if (result = line.match(/fatal: unable to access '(?<file>[^']+)'/)) {
                        errors.push({
                            category: 'credential',
                            type: 'Unable to clone',
                            library: result.groups.file
                        })
                    } else if (result = line.match(/fatal: Authentication failed for '(?<file>[^']+)'/)) {
                        errors.push({
                            category: 'credential',
                            type: 'Unable to clone',
                            library: result.groups.file
                        })
                    } else if (line.indexOf("Error: retrieving gpg key timed out.") != -1)  {
                        errors.push({
                            category: 'timeout',
                            type: '[gpg] Unable to install dependencies'
                        })
                    } else if (line.indexOf("Hash Sum mismatch") != -1)  {
                        errors.push({
                            category: 'connection',
                            type: 'Incorrect hash sum'
                        })
                    } else if (line.indexOf("Unable to connect to ") != -1)  {
                        errors.push({
                            category: 'connection',
                            type: 'Unable to install dependencies'
                        })
                    } else if (line.indexOf("Connection timed out") != -1)  {
                        errors.push({
                            category: 'timeout',
                            type: 'Connection timed out'
                        })
                    } else if (line.indexOf("The TLS connection was non-properly terminated.") != -1)  {
                        errors.push({
                            category: 'connection',
                            type: 'Connection terminated'
                        })
                    } else if (line.indexOf("The job exceeded the maximum time limit for jobs, and has been terminated.") != -1)  {
                        errors.push({
                            category: 'timeout',
                            type: 'Execution timeout'
                        })
                    } else if (line.indexOf("No output has been received in the last 10m") != -1)  {
                        errors.push({
                            category: 'timeout',
                            type: 'Log timeout'
                        })
                    } else if(result = line.match(/Failed to download (file|index): (?<file>[^ ]+)/)) {
                        errors.push({
                            category: 'connection',
                            type: 'Unable to install dependencies',
                            library: result.groups.file
                        })
                    } else if(result = line.match(/Unable to locate package (?<file>[^ ]+)/)) {
                        errors.push({
                            category: 'library',
                            type: 'Unable to install dependencies',
                            library: result.groups.file
                        })
                    } else if (result = line.match(/error: failed to push some refs to '(?<file>[^']+)'/)) {
                        errors.push({
                            category: 'credential',
                            type: 'Unable to push',
                            library: result.groups.file
                        })
                    } else if (line.indexOf('Address already in use') > -1) {
                        errors.push({
                            category: 'server',
                            type: 'port already in use'
                        })
                    }
                    

                    for (let parser of parsers) {
                        if (job.config && !parser.isCompatibleLanguage(job.config.language)) {
                            continue;
                        }
                        try {
                            parser.parse(line);
                        } catch (e) {
                            console.error(e, parser, job.id);
                        }
                    }
                }
            }

            for (let parser of parsers) {
                tests = tests.concat(parser.tests);
                errors = errors.concat(parser.errors);

                if (parser.tool != null && tool == null) {
                    tool = parser.tool
                }
            }

            const reasons = errors.concat([]);
            for (let test of tests) {
                if (test.nbFailure > 0) {
                    reasons.push({
                        category: "test",
                        test: test.name,
                        type: 'Test failure'
                    })
                } 
                if (test.nbError > 0) {
                    reasons.push({
                        category: "test",
                        test: test.name,
                        type: 'Test error'
                    })
                }
            }
            resolve({
                tests: tests,
                errors: errors,
                tool: tool,
                exitCode,
                reasons,
                commit
            })
        } catch (e) {
            return reject(e);
        }
    });
}

module.exports.parser = parseLog;