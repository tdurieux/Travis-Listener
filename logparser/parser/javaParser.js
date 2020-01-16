const Parser = require("./Parser").Parser;

const independents = [
    {
        element: new RegExp("\\[(?<name>[^\\]]+)\\]: (?<status>[A-Z]+) in (?<class>.*)"),
        type: 'test',
        failure_group: 'Test'
    },
    {
        element: new RegExp("(?<nbTest>[0-9]+) tests completed, (?<failed>[0-9]+) failed, ((?<skipped>[0-9]+) skipped)?"),
        type: 'test',
        failure_group: 'Test'
    },
    {
        element: new RegExp(new RegExp(" (?<name>[a-zA-Z0-9\\-_]+)\\(\\) (?<status>↷|■|✔)( (?<message>.*))?")),
        type: 'test',
        failure_group: 'Test'
    },
    {
        element: new RegExp("Running test:( test)? (?<name>.+)\\((?<class>.+)\\)"),
        type: 'test',
        failure_group: 'Test'
    },
    {
        element: new RegExp("(?<status>Failed) test (?<name>.+) \\[(?<class>.+)\\] with exception: "),
        type: 'test',
        failure_group: 'Test'
    },
    {
        element: new RegExp("\\[javac\\] (?<file>[^:]+):(?<line>[0-9]+): error: (?<message>.*)"),
        type: 'Compilation',
        failure_group: 'Compilation'
    },
    {
        element: new RegExp("Error: Could not find or load main class (?<file>.+)"),
        type: 'Execution',
        failure_group: 'Execution'
    },
    {
        element: new RegExp("\\[WARNING\\] Missing header in: (?<file>.+)"),
        type: 'License',
        failure_group: 'Chore'
    },
    {
        element: new RegExp("\\[ERROR\\] (?<file>[^:]+):\\[(?<line>[0-9]+)(,(?<column>[0-9]+))?\\] (?<message>\\((.+)\\) (.+))\."),
        type: 'Checkstyle',
        failure_group: 'Chore'
    },
    {
        element: new RegExp("\\[checkstyle\\]( \\[ERROR\\])? (?<file>[^:]+):(?<line>[0-9]+):((?<column>[0-9]+):)? (?<message>.+)"),
        type: 'Checkstyle',
        failure_group: 'Chore'
    },
    {
        element: new RegExp("Could not find (?<group>[^: ]+):(?<artifact>[^: ]+)(:(pom|jar))?:(?<version>[^ ]+)\."),
        type: 'Missing library',
        failure_group: 'Installation'
    },
    {
        element: new RegExp("Could not transfer artifact (?<group>[^: ]+):(?<artifact>[^: ]+)(:(pom|jar))?:(?<version>[^ ]+)"),
        type: 'Missing library',
        failure_group: 'Installation'
    },
    {
        element: new RegExp("Failure to find (?<group>[^: ]+):(?<artifact>[^: ]+)(:(pom|jar))?:(?<version>[^ ]+)"),
        type: 'Missing library',
        failure_group: 'Installation'
    },
    {
        element: new RegExp("PMD Failure: (?<file>[^:]+):(?<line>[0-9]+) Rule:(?<rule>.+) Priority:(?<priority>[0-9]+) (?<message>.+)"),
        type: 'Checkstyle',
        failure_group: 'Chore'
    },
    {
        element: new RegExp("(?<nbTest>[0-9]+) tests? completed, (?<failure>[0-9]+) failed"),
        type: 'test',
        failure_group: 'Test'
    },
    {
        element: new RegExp("Tests run: (?<nbTest>[0-9]+), Failures: (?<failure>[0-9]+), Errors: (?<error>[0-9]+), Skipped: (?<skipped>[0-9]+)(, Time elapsed: (?<time>[0-9\.]+) ?s)?"),
        type: 'test',
        failure_group: 'Test'
    }
]


const groups = [
    {
        name: 'audit',
        type: 'Checkstyle',
        failure_group: 'Chore',
        start: new RegExp("\\[INFO\\] Starting audit\.+"),
        end: new RegExp("Audit done\.+"),
        element: new RegExp("(?<file>[^:]+):(?<line>[0-9]+):((?<column>[0-9]+):)? (?<message>.+)")
    },
    {
        name: 'checkstyle',
        type: 'Checkstyle',
        failure_group: 'Chore',
        start: new RegExp("\\[INFO\\] There (is|are) (.+) errors? reported by Checkstyle .+ with (.+) ruleset\."),
        end: new RegExp("\\[INFO\\] -+"),
        element: new RegExp("\\[ERROR\\] (?<file>[^:]+):\\[(?<line>[0-9]+)(,(?<column>[0-9]+))?\\] (?<message>.+)\.")
    },
    {
        name: 'compile',
        type: 'Compilation',
        failure_group: 'Compilation',
        start: new RegExp("\\[ERROR\\] COMPILATION ERROR"),
        end: new RegExp("location\\: +(.+)"),
        element: new RegExp("\\[ERROR\\] (?<file>[^:]+):\\[(?<line>[0-9]+)(,(?<column>[0-9]+))?\\] (?<message>.+)")
    },
    {
        name: 'compile',
        type: 'Compilation',
        failure_group: 'Compilation',
        start: new RegExp("\\[ERROR\\] COMPILATION ERROR"),
        end: new RegExp("location\\: +(.+)"),
        element: new RegExp("(?<file>[^:]+):\\[(?<line>[0-9]+)(,(?<column>[0-9]+))?\\] error: (?<message>.+)")
    },
    {
        name: 'compile',
        type: 'Compilation',
        failure_group: 'Compilation',
        start: new RegExp("\\[ERROR\\] COMPILATION ERROR"),
        end: new RegExp("location\\: +(.+)"),
        element: new RegExp("(?<file>.+):(?<line>[0-9]+): error: (?<message>.+)")
    },
    {
        name: 'test',
        type: 'test',
        failure_group: 'Test',
        start: new RegExp("Running (?<name>.*Tests?.*)$"),
        end: new RegExp("Tests run: (?<nbTest>[0-9]+), Failures: (?<failure>[0-9]+), Errors: (?<error>[0-9]+), Skipped: (?<skipped>[0-9]+)(, Time elapsed: (?<time>[0-9\.]+) ?s)?"),
        element: new RegExp("(?<all_line>.+)")
    },
    {
        name: 'graddle',
        type: 'test',
        failure_group: 'Test',
        start: new RegExp("([0-9]+)\\) (?<name>.+) \\((?<class>.+)\\)"),
        end: new RegExp("Tests run: (?<nbTest>[0-9]+),  Failures: (?<failure>[0-9]+)"),
        element: new RegExp("(?<all_line>.+)")
    },
    {
        name: 'graddle2',
        type: 'test',
        failure_group: 'Test',
        start: new RegExp("Executing test (?<name>.+) \\[(?<class>.+)\\]"),
        end: new RegExp("(((?<nbTest>[0-9]+) tests completed, (?<failure>[0-9]+) failed)|(Executing test (?<name>.+) \\[(?<class>.+)\\]))"),
        startIsEnd: true,
        element: new RegExp("(?<all_line>.+)")
    },
    {
        name: 'compare',
        type: 'Compare version',
        failure_group: 'Chore',
        start: new RegExp("\\[INFO\\] Comparing to version: "),
        end: new RegExp("\\[INFO\\] -+"),
        element: new RegExp("\\[ERROR\\] (?<id>[0-9]+): (?<file>.+): ")
    }
]

class JavaParser extends Parser {
    constructor() {
        super("JavaParser");
        this.languages.push("java");
        this.inGroup = null

        this.currentElement = null;
    }

    parse(line) {
        for(let group  of groups) {
            if (this.inGroup != null && group.name != this.inGroup) {
                continue
            }
            
            if (this.inGroup == null) {
                const result = group.start.exec(line)
                if (result != null) {
                    this.inGroup = group.name

                    if (group.type == 'test') {
                        
                        this.currentElement = {
                            name: result.groups.name,
                            class: result.groups.class,
                            body: "",
                            nbTest: 1,
                            nbFailure: 0,
                            nbError: 0,
                            nbSkipped: 0,
                            time: 0
                        }
                        this.tests.push(this.currentElement)
                    }
                    return
                }
            } else {
                let result = group.end.exec(line)
                if (result != null) {
                    if  (this.currentElement != null && result.groups && result.groups.nbTest) {
                        this.currentElement.nbTest = result.groups.nbTest
                        this.currentElement.nbFailure = result.groups.failure
                        this.currentElement.nbError = result.groups.error
                        this.currentElement.nbSkipped = result.groups.skipped
                        this.currentElement.time = result.groups.time
                    }
                    if (group.name == 'graddle2' && this.currentElement.body != null && this.currentElement.body != '') {
                        if (this.currentElement.body.indexOf('FAIL') != -1) {
                            this.currentElement.nbFailure++
                        } else if (this.currentElement.body.indexOf('ERROR') != -1) {
                            this.currentElement.nbError++
                        }
                    }
                    this.currentElement == null
                    if (group.startIsEnd === true && group.type == 'test' && !result.groups.nbTest) {
                        this.currentElement = {
                            name: result.groups.name,
                            class: result.groups.class,
                            body: "",
                            nbTest: 1,
                            nbFailure: 0,
                            nbError: 0,
                            nbSkipped: 0,
                            time: 0
                        }
                        this.tests.push(this.currentElement)
                    } else {
                        this.inGroup = null
                    }
                    return
                }
                result = group.element.exec(line)
                if (result != null) {
                    if (result.groups.all_line) {
                        //this.currentElement.body += result.groups.all_line + '\n'
                    } else {
                        const output = {
                            type: group.type
                        }
                        for (let key in result.groups) {
                            if (result.groups[key] != null) {
                                output[key] = result.groups[key]
                            }
                        }
                        this.errors.push(output)
                    }
                    return
                }
            }
        }
        if (this.inGroup) {
            return
        }
        for (var independent of independents) {
            let result = independent.element.exec(line)
            if (result != null) {
                const output = {
                    type: independent.type
                }
                for (let key in result.groups) {
                    if (result.groups[key] != null) {
                        let value = result.groups[key]
                        if (Number(value) == value) {
                            value = Number(value)
                        }
                        output[key] = value
                    }
                }
                if (independent.type == 'test') {
                    delete output.type
                    if (output.status) {
                        console.log(output.status)
                    }
                    if (!output.nbTest) {
                        output.nbTest = 1
                    }
                    this.tests.push(output)
                } else {
                    this.errors.push(output)
                }
                return
            }
        }
    }
}

module.exports.Parser = JavaParser;