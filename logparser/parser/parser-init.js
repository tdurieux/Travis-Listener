const stripAnsi = require('strip-ansi');
const Parser = require('./Parser').Parser;
const JavaParser = require('./javaParser').Parser;
const JsParser = require('./npmParser').Parser;
const PyParser = require('./pythonParser').Parser;
const ObjcParser = require('./objcParser').Parser;
const PhpParser = require('./phpParser').Parser;
const GoParser = require('./goParser').Parser;
const RubyParser = require('./rubyParser').Parser;

const startWith = require('../clean_log').startWith

const fold_start = new RegExp("travis_fold:start:(.*)");
const fold_end = new RegExp("travis_fold:end:(.*)");

async function parseLog(log) {
    return new Promise(async (resolve, reject) => {
        const job = {}
        try {
            /**
             * @type {Parser[]}
             */
            const parsers = [new JavaParser(), new JsParser(), new PyParser(), new ObjcParser(), new PhpParser(), new RubyParser(), new GoParser()];

            let exitCode = null;

            let tool = null;
            let tests = [];
            let errors = [];

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
                    }
                    if (line.indexOf("Done. Your build exited with ") != -1) {
                        exitCode = parseInt(line.substring("Done. Your build exited with ".length, line.length -1));
                    }

                    if (line.indexOf("fatal: Could not read from remote repository.") != -1)  {
                        errors.push({
                            type: 'Unable to clone'
                        })
                    }

                    if (line.indexOf("Error: retrieving gpg key timed out.") != -1)  {
                        errors.push({
                            category: 'timeout',
                            type: '[gpg] Unable to install dependencies'
                        })
                    }

                    if (line.indexOf("Unable to connect to ") != -1)  {
                        errors.push({
                            category: 'connection',
                            type: 'Unable to install dependencies'
                        })
                    }

                    

                    if (line.indexOf("Connection timed out") != -1)  {
                        errors.push({
                            category: 'timeout',
                            type: 'Connection timed out'
                        })
                    }

                    if (line.indexOf("The TLS connection was non-properly terminated.") != -1)  {
                        errors.push({
                            category: 'connection',
                            type: 'Connection terminated'
                        })
                    }

                    if (line.indexOf("The job exceeded the maximum time limit for jobs, and has been terminated.") != -1)  {
                        errors.push({
                            category: 'timeout',
                            type: 'Execution timeout'
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

            resolve({
                tests: tests,
                errors: errors,
                tool: tool,
                exitCode
            })
        } catch (e) {
            return reject(e);
        }
    });
}

module.exports.parser = parseLog;