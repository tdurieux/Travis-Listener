const supported_langs = {
    "android": [],
    "c": [],
    "c#": ["csharp"],
    "c++": ['cpp'],
    "clojure": [],
    "crystal": [],
    "d": [],
    "dart": [],
    "elixir": [],
    "elm": [],
    "erlang": [],
    "f#": [],
    "generic": ["general", "generic-covered"],
    "go": ["golang"],
    "groovy": [],
    "haskell": [],
    "haxe": [],
    "java": ["openjdk", 'jvm'],
    'kotlin': [],
    'fortran': [],
    "node.js": ["node_js", "node-js", "javascript", "node", 'js', 'nodejs', 'typescript'],
    "julia": [],
    "lua": [],
    "latex": [],
    "lisp": [],
    "minimal": ["bash", "shell", "sh", 'none', 'vim', "defaults", 'base'],
    "nix": [],
    "objective-c": ["obj-c"],
    "ocaml": [],
    "octave": [],
    "perl": ["perl6"],
    "php": [],
    "python": [],
    "r": [],
    "ruby": [],
    "rust": [],
    "scala": [],
    "smalltalk": [],
    "swift": [],
    "visual basic": ["visualbasic"]
}

function getLang(lang) {
    if (lang == null) {
        return null
    }
    if (lang.length != null) {
        lang = lang[0]
    }
    if (lang[0] == '{') {
        lang = lang.replace('{:', '').split('=>')[0]
    }
    lang = lang.toLowerCase()
                .replace(';', '')
                .replace('2.7', '')
                .replace('3.6', '')
                .replace('3.7.4', '')
    lang = lang.split(' - ')[0]
    lang = lang.split(' ')[0]
    if (supported_langs[lang]) {
        return lang;
    }
    for (let s_lang in supported_langs) {
        for (let l of supported_langs[s_lang]) {
            if (l == lang) {
                return s_lang;
            }
        }
    }
    for (let s_lang in supported_langs) {
        if (lang.replace(s_lang, '').length <= 2) {
            return s_lang;
        }
        for (let l of supported_langs[s_lang]) {
            if (lang.replace(l, '').length <= 2) {
                return s_lang;
            }
        }
    }
    return lang;
}

module.exports = function(agenda, restartedDB, buildsaverDB) {
    const jobsCollection = buildsaverDB.collection('jobs')
    const stat = {}
    agenda.define('clean languages', {concurrency: 1}, async job => {
        await jobsCollection.find({}).forEach(j => {
            try {
                const l = getLang(j.language)
                if (l == null) {
                    console.log(j.language)
                } else {
                    stat[l] = (stat[l] || 0) + 1
                }
            } catch (error) {
                console.log(error)
            }
        })
        console.log(stat)
    })
}