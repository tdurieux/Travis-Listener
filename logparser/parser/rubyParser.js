const Parser = require("./Parser").Parser;

const test = new RegExp("^([\\.sF\\*]{4,})$");

const moduleNotFound = new RegExp("ModuleNotFoundError: No module named '(?<library>[^']+)'")

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
        } else if ((result = moduleNotFound.exec(line))) {
            this.errors.push({
                category: 'library',
                type: 'Module not found',
                library: result.groups.library
            })
        } 
    }
}

module.exports.Parser = RubyParser;