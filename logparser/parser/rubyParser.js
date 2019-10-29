const Parser = require("./Parser").Parser;

const test = new RegExp("^([\\.sF\\*]{4,})$");

class RubyParser extends Parser {
    constructor() {
        super("RubyParser");

        this.languages.push("ruby");
    }

    parse(line) {
        let result = null;
        if ((result = test.exec(line))) {
            this.tests.push({
                name: "",
                body: "",
                nbTest: result[1].length,
                nbFailure: (result[1].match(/F/g)||[]).length,
                nbError: 0,
                nbSkipped: (result[1].match(/\\s/g)||[]).length,
                time: 0
            });
        }
    }
}

module.exports.Parser = RubyParser;