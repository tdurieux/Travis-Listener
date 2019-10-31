const Parser = require("./Parser").Parser;

const compilationError = new RegExp("(?<category>[a-zA-Z]+)\\[(?<id>[0-9]+)\\] (?<message>[^:]+): (?<parameter>.+)")

const interactiveLogin = new RegExp("Error: Cannot perform an interactive login from a non TTY device")

// CMake 3.4 or higher is required.  You are running version 3.1.3
const cmakeVersionProblem = new RegExp("CMake (?<expected>[0-9\.]+) or higher is required.  You are running version (?<actual>[0-9\.]+)")

// [error] org.xmlaxAXParseException; lineNumber: 6; columnNumber: 3; The element type "hr" must be terminated by the matching end-tag "".
const genericError = new RegExp("\[error\] (?<name>[^;]+); lineNumber: (?<line>[0-9]+); columnNumber: (?<column>[0-9]+); (?<message>.+)")

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
        } else if ((result = cmakeVersionProblem.exec(line))) {
            this.errors.push({
                category: 'compilation',
                type: 'Invalid cmake version',
                actual: result.groups.actual,
                expected: result.groups.expected
            })
        } else if ((result = genericError.exec(line))) {
            this.errors.push({
                type: 'generic',
                message: result.groups.message,
                line: result.groups.line,
                column: result.groups.column,
            })
        } 
    }
}

module.exports.Parser = GenericParser;