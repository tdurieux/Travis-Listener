const Parser = require("./Parser").Parser;

const test = new RegExp("^([\\.sF\\*]{4,})$");
const test2 = new RegExp("Tests run: (?<nbTest>[0-9]+), Failures: (?<failure>[0-9]+), Errors: (?<error>[0-9]+), Skipped: (?<skipped>[0-9]+)(, Time elapsed: (?<time>[0-9\.]+) ?s)?");

const moduleNotFound = new RegExp("ModuleNotFoundError: No module named '(?<library>[^']+)'")
const notGem = new RegExp('No Gemfile found, skipping bundle install')
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
        } else if ((result = test2.exec(line))) {
            this.tests.push({
                name: "",
                body: "",
                nbTest: parseInt(result.groups.nbTest),
                nbFailure: parseInt(result.groups.failure),
                nbError: parseInt(result.groups.error),
                nbSkipped: parseInt(result.groups.skipped),
                time: parseFloat(result.groups.time),
            });
        } else if ((result = moduleNotFound.exec(line))) {
            this.errors.push({
                category: 'library',
                type: 'Module not found',
                library: result.groups.library
            })
        } else if ((result = notGem.exec(line))) {
            this.errors.push({
                category: 'dependency_manager',
                type: 'No Gemfile found'
            })
        } 
    }
}

module.exports.Parser = RubyParser;