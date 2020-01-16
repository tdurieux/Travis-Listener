const Parser = require("./Parser").Parser;

const timeRegex = new RegExp("Time: ([0-9\\.]+) ([^,]+), Memory: ([0-9\\.]+)(.+)");
const time2Regex = new RegExp("Time: ([0-9]+:[0-9]+), Memory: ([0-9\\.]+)(.+)");
const testResults = new RegExp("Tests: ([0-9]+), Assertions: ([0-9]+)(, Errors: ([0-9]+))?(, Failures: ([0-9]+))?(, Skipped: ([0-9]+))?(, Incomplete: ([0-9]+))?.");
const testResultsOk = new RegExp("OK \\(([0-9]+) tests, ([0-9]+) assertions\\)");

const missingPackage = new RegExp("The requested package (?<library>[^ ]+) could not be found in any version")
const missingPackage2 = new RegExp("No releases available for package \"(?<library>[^\"]+)\"")

class PhpParser extends Parser {
    constructor() {
        super("PhpParser");
        this.currentTest = null;
        this.languages.push("php");
    }

    parse(line) {
        let test;
        if (test = timeRegex.exec(line)) {
            this.currentTest = {
                failure_group: 'Test',
                name: "",
                body: "",
                nbTest: 0,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: parseInt(test[1]) * ((test[2] == "minutes")? 60: 1)
            };
        } else if (test = time2Regex.exec(line)) {
            this.currentTest = {
                failure_group: 'Test',
                name: "",
                body: "",
                nbTest: 0,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: parseInt(test[1]) * 60 + parseInt(test[2])
            };
        } else if (test = testResults.exec(line)) {
            if (this.currentTest == null) {
                this.currentTest = {
                    failure_group: 'Test',
                    name: "",
                    body: "",
                    nbTest: parseInt(test[1]),
                    nbFailure: test[6] ? parseInt(test[6]) : 0,
                    nbError: test[4] ? parseInt(test[4]) : 0,
                    nbSkipped: test[8] ? parseInt(test[8]) : 0
                };
            }
            this.currentTest.nbTest = parseInt(test[1]);
            this.currentTest.nbAssertion = parseInt(test[2]);
            this.currentTest.nbError = test[4] ? parseInt(test[4]) : 0;
            this.currentTest.nbFailure = test[6] ? parseInt(test[6]) : 0;
            this.currentTest.nbSkipped = test[8] ? parseInt(test[8]) : 0;
            this.currentTest.nbIncomplete = test[10] ? parseInt(test[10]) : 0;
            this.tests.push(this.currentTest);
            this.currentTest = null;
        } else if (test = testResultsOk.exec(line)) {
            if (this.currentTest == null) {
                this.currentTest = {
                    failure_group: 'Test',
                    name: "",
                    body: "",
                    nbTest: parseInt(test[1])
                };
            }
            this.currentTest.nbTest = parseInt(test[1]);
            this.currentTest.nbAssertion = parseInt(test[2]);
            this.tests.push(this.currentTest);
            this.currentTest = null;
        } else if (test = missingPackage.exec(line)) {
            this.errors.push({
                category: 'library',
                failure_group: 'Installation',
                type: 'Unable to install dependencies',
                library: test.groups.library
            });
        } else if (test = missingPackage2.exec(line)) {
            this.errors.push({
                category: 'library',
                failure_group: 'Installation',
                type: 'Unable to install dependencies',
                library: test.groups.library
            });
        }
    }
}

module.exports.Parser = PhpParser;