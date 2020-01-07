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
    "latex": ['tex'],
    "lisp": [],
    "minimal": ["bash", "shell", "sh", 'none', 'vim', "defaults", 'base', 'default', 'slim'],
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
    if (Array.isArray(lang)) {
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

module.exports = function (agenda, restartedDB, buildsaverDB) {
    const collection = restartedDB.collection('builds')
    const repoCollection = buildsaverDB.collection('repositories')
    const stat = {}
    agenda.define('clean restarted languages', { concurrency: 1 }, async job => {
        await collection.find({}).forEach(async j => {
            try {
                const l = getLang(j.old.language)
                let repo_lang = j.old.repoLanguage
                if (repo_lang == null) {
                    const repo = (await repoCollection.findOne({ travis_id: j.old.repository_id }))
                    if (repo != null) {
                        repo_lang = repo.language
                    }
                }

                if (l == null) {
                    console.log(j.old.language)
                } else {
                    stat[repo_lang] = (stat[repo_lang] || 0) + 1
                    j.old.language = l;
                    j.new.language = l;
                    j.repoLanguage = repo_lang;
                    j.old.repoLanguage = repo_lang;
                    j.new.repoLanguage = repo_lang;
                    await collection.updateOne({ _id: j._id }, { $set: j }, { upsert: true })
                }
            } catch (error) {
                console.log(error)
            }
            await job.touch();
        })
        console.log(stat)
    })
}