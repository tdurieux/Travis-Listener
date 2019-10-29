const Parser = require("./Parser").Parser;

const test1 = new RegExp("--- PASS: ([^ ]+) ?(\\(([0-9.,:]+)([^\t]+)\\))?");
const test2 = new RegExp("--- FAIL: ([^ ]+) ?(\\(([0-9.,:]+)([^\t]+)\\))?");
const test3 = new RegExp("ok[ \t]+([^\t]+)[ \t]+([0-9\.,:]+)([^\t]+)[ \t]+([^\t]+)");
const test4 = new RegExp("FAIL[ \t]+([^ ^\t]+)([ \t]+([0-9.,:]+)([^\t]+))?");
const test5 = new RegExp("--- SKIP:(.+)");

const dep1 = new RegExp("gimme: given '([^ ]+)' but no release for '([^ ]+)' found")



class RubyParser extends Parser {
    constructor() {
        super("GoParser");
        this.languages.push("go");
    }

    parse(line) {
        let result = null;
        if ((result = test1.exec(line))) {
            this.tool = "gotest"
            this.tests.push({
                name: result[1],
                body: "",
                nbTest: 1,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: parseFloat(result[3])
            });
        } else if ((result = test2.exec(line))) {
            this.tool = "gotest"
            this.tests.push({
                name: result[1],
                body: "",
                nbTest: 1,
                nbFailure: 1,
                nbError: 0,
                nbSkipped: 0,
                time: parseFloat(result[3])
            });
        } else if ((result = test3.exec(line))) {
            this.tool = "gotest"
            this.tests.push({
                name: result[1],
                body: "",
                nbTest: 1,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: parseFloat(result[2])
            });
        } else if ((result = test4.exec(line))) {
            this.tool = "gotest"
            this.tests.push({
                name: "",
                body: "",
                nbTest: 1,
                nbFailure: 0,
                nbError: 0,
                nbSkipped: 0,
                time: 0
            });
        } else if ((result = test5.exec(line))) {
            this.tool = "gotest"
            this.tests.push({
                name: result[1],
                body: "",
                nbTest: 1,
                nbFailure: 1,
                nbError: 0,
                nbSkipped: 1,
                time: parseFloat(result[3])
            });
        } else if ((result = dep1.exec(line))) {
            this.errors.push({
                category: 'dependency',
                type: 'Dependency not found',
                message: result[0]
            })
        }
    }
}

module.exports.Parser = RubyParser;