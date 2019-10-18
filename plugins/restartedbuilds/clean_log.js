const stripAnsi = require('strip-ansi')
module.exports.cleanLog = function (log) {
    log = stripAnsi(log)
    const properties = [
        /(hostname:).*/g,
        /(version:).*/g,
        /(instance:).*/g,
        /(startup:).*/g,
        /(travis-build version:).*/g,
        /(process ).*/g,
        /(Get):[0-9]+/g
    ]
    const toRemove = [
        // date

        /.{3}, +([0-9]+) +.{3} ([0-9]+) ([0-9]+):([0-9]+):([0-9]+) +\+([0-9]+)/g,
        /.{3}, +([0-9]+):([0-9]+):([0-9]+) \+([0-9]+)/g,
        /([0-9]+)\.([0-9]+):([0-9]+):([0-9]+)\.([0-9]+)/g,
        /([0-9]+)-([0-9]+)-([0-9]+) ([0-9]+):([0-9]+):([0-9]+)/g,
        /([0-9]+)\/([0-9]+)\/([0-9]+) ([0-9]+):([0-9]+):([0-9]+) (PM|AM)/g,
        // travis stuffs
        /.*travis_.*/g,
        /.*remote:.*/g,
        /.*\/home\/travis\/\.cache.*/g,
        /Receiving objects:.*/g,
        /Resolving deltas:.*/g,
        /Unpacking objects:.*/g,
        /\(([0-9]+)\/([0-9]+)\)/g,
        // ids
        /([0-9]{5,})/g,
        /([0-9a-f]{10,})/g,
        // time
        /in .*s/g,
        /(-->) +([0-9]+)%/g,
        /([0-9]+)ms/g,
        /([0-9\.]+) MB\/s/g,
        /([0-9\.]+)M=0s/g,
        /\[([0-9\,\.]+) k?M?B\]/g,
        /Fetched ([0-9\.]+) MB/g,
        /([0-9\.]+) seconds/g,
        / ... /g,
        // ip
        /([0-9\.]+).([0-9\.]+).([0-9\.]+).([0-9\.]+)/g
    ]
    for (let property of properties) {
        log = log.replace(property, '$1')
    }
    for (let property of toRemove) {
        log = log.replace(property, '')
    }
    output = []
    for (let line of log.split(/\r?\n/)) {
        const trimmedLine = line.trim()
        if (trimmedLine.length == 0 || trimmedLine == '') {
            continue
        }
        output.push(line)
    }
    return output.join('\n')
}