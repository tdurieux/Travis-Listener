class Parser {
    constructor(name) {
        this.name = name;
        this.languages = [];

        this.tests = [];
        this.errors = [];

        this.tool = null;
    }

    parse(line) {}

    isCompatibleLanguage(language) {
        if (this.languages.length == 0) {
            return true;
        }
        return this.languages.indexOf(language.toLowerCase()) != -1;
    }
}

module.exports.Parser = Parser;