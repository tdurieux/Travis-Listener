const Parser = require("./Parser").Parser;

const test = new RegExp("([0-9]+)/([0-9]+) Test +#([0-9]+): (.+) \\.+ +([^ ]+) +(.+) sec");
// ✗ testDisable_ShouldCallWithAPNSToken_WhenCalledExplicitlyWithAPNSTokenParameter, Asynchronous wait failed: Exceeded timeout of , with unfulfilled expectations: "clientsDestroyCompletion".
const test1 = new RegExp(" ✗ (?<test>[^,]+), (?<message>.+)");
// Executed 550 tests, with 1 failure (0 unexpected) in 140.378 (140.898) seconds
const testSummary = new RegExp("Executed (?<executed>[0-9]+) tests, with (?<failure>[0-9]+) failure \((?<unexpected>[0-9]+) unexpected\) in (?<duration>[0-9-\.]+)");
class ObjcParser extends Parser {
    constructor() {
        super("ObjcParser");
        this.languages.push("objc", 'objective-c');
    }

    parse(line) {
        let result;
        if (result = test.exec(line)) {
            this.tests.push({
                failure_group: 'Test',
                name: result[4],
                body: "",
                nbTest: 1,
                nbFailure: result[5] != "Passed"? 1:0,
                nbError: 0,
                nbSkipped: 0,
                time: parseFloat(result[6])
            });
        } else if (result = test1.exec(line)) {
            this.tests.push({
                failure_group: 'Test',
                name: result.groups.test,
                body: result.groups.message,
                nbTest: 1,
                nbFailure: 1,
                nbError: 0,
                nbSkipped: 0
            });
        } else if (result = testSummary.exec(line)) {
            this.tests.push({
                failure_group: 'Test',
                name: result.groups.test,
                body: result.groups.message,
                nbTest: result.groups.executed,
                nbFailure: result.groups.failure,
                nbError: 0,
                nbSkipped: 0,
                time: parseFloat(result.groups.duration)
            });
        }
    }
}

module.exports.Parser = ObjcParser;