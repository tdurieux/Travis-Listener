const Parser = require("./Parser").Parser;

const timeRegex = new RegExp("Time: ([0-9\\.]+) ([^,]+), Memory: ([0-9\\.]+)(.+)");
const time2Regex = new RegExp("Time: ([0-9]+:[0-9]+), Memory: ([0-9\\.]+)(.+)");
const testResults = new RegExp("Tests: ([0-9]+), Assertions: ([0-9]+)(, Errors: ([0-9]+))?(, Failures: ([0-9]+))?(, Skipped: ([0-9]+))?(, Incomplete: ([0-9]+))?.");
const testResultsOk = new RegExp("OK \\(([0-9]+) tests, ([0-9]+) assertions\\)");

class PhpParser extends Parser {
    constructor() {
        super("PhpParser");
        this.currentTest = null;
        this.languages.push("php");
    }

    parse(line) {
        let time = timeRegex.exec(line);
        if (time) {
            this.currentTest = {
                name: "",
                body: "",
                nbTest: 0,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: parseInt(time[1]) * ((time[2] == "minutes")? 60: 1)
            };
        } else {
            time = time2Regex.exec(line);
            if (time) {
                this.currentTest = {
                    name: "",
                    body: "",
                    nbTest: 0,
                    nbFailure: 0,
                    nbError: 0,
                    nbSkipped: 0,
                    time: parseInt(time[1]) * 60 + parseInt(time[2])
                };
            } else {
                let test = testResults.exec(line);
                if (test) {
                    this.currentTest.nbTest = parseInt(test[1]);
                    this.currentTest.nbAssertion = parseInt(test[2]);
                    this.currentTest.nbError = test[4] ? parseInt(test[4]) : 0;
                    this.currentTest.nbFailure = test[6] ? parseInt(test[6]) : 0;
                    this.currentTest.nbSkipped = test[8] ? parseInt(test[8]) : 0;
                    this.currentTest.nbIncomplete = test[10] ? parseInt(test[10]) : 0;
                    this.tests.push(this.currentTest);
                    this.currentTest = null;
                } else {
                    let test = testResultsOk.exec(line);
                    if (test) {
                        this.currentTest.nbTest = parseInt(test[1]);
                        this.currentTest.nbAssertion = parseInt(test[2]);
                        this.tests.push(this.currentTest);
                        this.currentTest = null;
                    }
                }
            }
        }
    }
}

module.exports.Parser = PhpParser;