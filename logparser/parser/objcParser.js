const Parser = require("./Parser").Parser;

const test = new RegExp("([0-9]+)/([0-9]+) Test +#([0-9]+): (.+) \\.+ +([^ ]+) +(.+) sec");
// ✗ testDisable_ShouldCallWithAPNSToken_WhenCalledExplicitlyWithAPNSTokenParameter, Asynchronous wait failed: Exceeded timeout of , with unfulfilled expectations: "clientsDestroyCompletion".
const test1 = new RegExp(" ✗ (?<test>[^,]+), (?<message>.+)");

class ObjcParser extends Parser {
    constructor() {
        super("ObjcParser");
        this.languages.push("objc");
    }

    parse(line) {
        let result;
        if (result = test.exec(line)) {
            this.tests.push({
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
                name: result.groups.test,
                body: result.groups.message,
                nbTest: 1,
                nbFailure: 1,
                nbError: 0,
                nbSkipped: 0
            });
        }
    }
}

module.exports.Parser = ObjcParser;