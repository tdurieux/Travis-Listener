const Parser = require("./Parser").Parser;

const testNoAssert = new RegExp("✖ (.*) Test finished without running any assertions");
const testPassed = new RegExp("(✔|✓) ([^\\(]+)( \\(([0-9\\.]+)(.+)\\))?$");
const test2 = new RegExp("(ok|ko) ([0-9]+) (.*)$");
const test3 = new RegExp("Executed ([0-9]+) of ([0-9]+) (.*) \\(([0-9\\.]*) secs / ([0-9\\.]*) secs\\)");
const test4 = new RegExp("    ✗ (?<test>.*)")
const test5 = new RegExp("^FAIL (?<test>.*)")

// Spec Files:	 5 passed, 2 failed, 7 total (1 completed) in  
const testSummary1 = new RegExp("Spec Files: +(?<passed>[0-9]+) passed, (?<failed>[0-9]+) failed, (?<total>[0-9]+) total")


const error = new RegExp("(.+):([0-9]+):([0-9]+) - error ([A-Z1-9]+): (.+)")

const endMocha = new RegExp("([1-9]+) passing (.*)\\(([1-9]+)(.*)s\\)$");

const unavailableVersion = new RegExp("No matching version found for (?<library>[^@]+)@(?<version>.+)")
const unavailablePackage = new RegExp("error Couldn't find package \"(?<library>[^\"]+)\" required by \"(?<required>[^\"]+)\"")

class JsParser extends Parser {
    constructor() {
        super("JSParser");
        this.languages.push("node_js");
    }

    parse(line) {
        if (this.tool == null && line.indexOf("mocha ") != -1) {
            this.tool = "mocha";
            this.startingMocha = true;
            this.totalTime = 0;
        }
        let result;
        if (result = testNoAssert.exec(line)) {
            this.tests.push({
                name: result[1],
                body: "",
                nbTest: 1,
                nbFailure: 0,
                nbError: 1,
                nbSkipped: 0,
                time: 0
            });
        } else if (this.startingMocha && (result = testPassed.exec(line))) {
            let time = 0;
            if (result[4] != null) {
                time = parseFloat(result[4])
                if (result[5] == "ms") {
                    time *= 0.001;
                } else if (result[5] == "m") {
                    time *= 60;
                }
            }
            this.tests.push({
                name: result[2],
                body: "",
                nbTest: 1,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: time
            });
        } else if (result = test2.exec(line)) {
            this.tests.push({
                name: result[3],
                body: "",
                nbTest: 1,
                nbFailure: result[1] != "ok" ? 1:0,
                nbError: 0,
                nbSkipped: 0,
                time: 0
            });
        } else if (result = test3.exec(line)) {
            this.tests.push({
                name: '',
                body: "",
                nbTest: 1,
                nbFailure: result[3] != "SUCCESS" ? 1:0,
                nbError: 0,
                nbSkipped: 0,
                time: parseFloat(result[5])
            });
        } else if (result = test4.exec(line)) {
            this.tests.push({
                name: result.groups.test,
                body: "",
                nbTest: 1,
                nbFailure: 1,
                nbError: 0,
                nbSkipped: 0
            });
        } else if (result = test5.exec(line)) {
            this.tool = 'jasmine2'
            this.tests.push({
                name: result.groups.test,
                body: "",
                nbTest: 1,
                nbFailure: 1,
                nbError: 0,
                nbSkipped: 0
            });
        } else if (result = testSummary1.exec(line)) {
            this.tests.push({
                name: "",
                body: "",
                nbTest: result.groups.total,
                nbFailure: result.groups.failure,
                nbError: 0,
                nbSkipped: 0
            });
        } else if (result = error.exec(line)) {
            this.errors.push({
                file: result[1],
                line: parseInt(result[2]),
                message: result[5]
            });
        } else if (result = endMocha.exec(line)) {
            this.startingMocha = false;
            this.totalTime = parseFloat(result[3]);
        } else if (result = unavailablePackage.exec(line)) {
            this.errors.push({
                category: 'library',
                type: 'Unable to install dependencies',
                requiredBy: result.groups.required,
                library: result.groups.library,
            });
        } else if (result = unavailableVersion.exec(line)) {
            this.errors.push({
                category: 'library',
                type: 'Unable to install dependencies',
                library: result.groups.library,
                version: result.groups.version,
            });
        }
    }
}

module.exports.Parser = JsParser;