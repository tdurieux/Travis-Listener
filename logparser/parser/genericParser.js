const Parser = require("./Parser").Parser;

const compilationError = new RegExp("(?<category>[a-zA-Z]+)\\[(?<id>[0-9]+)\\] (?<message>[^:]+): (?<parameter>.+)")

const interactiveLogin = new RegExp("Error: Cannot perform an interactive login from a non TTY device")
class GenericParser extends Parser {
    constructor() {
        super("GenericParser");
    }

    parse(line) {
        let result = null;
        if ((result = compilationError.exec(line))) {
            this.errors.push({
                type: 'Compilation error',
                message: result.groups.message,
                parameter: result.groups.parameter,
            })
        } else if ((result = interactiveLogin.exec(line))) {
            this.errors.push({
                category: 'bash',
                type: 'No interactive operation allowed'
            })
        } 
    }
}

module.exports.Parser = GenericParser;