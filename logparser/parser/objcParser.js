const Parser = require("./Parser").Parser;

const test = new RegExp("([0-9]+)/([0-9]+) Test +#([0-9]+): (.+) \\.+ +([^ ]+) +(.+) sec");

class ObjcParser extends Parser {
    constructor() {
        super("ObjcParser");
        this.languages.push("objc");
    }

    parse(line) {
        let result = test.exec(line);
        if (result) {
            this.tests.push({
                name: result[4],
                body: "",
                nbTest: 1,
                nbFailure: result[5] != "Passed"? 1:0,
                nbError: 0,
                nbSkipped: 0,
                time: parseFloat(result[6])
            });
        }
    }
}

module.exports.Parser = ObjcParser;