const stripAnsi = require('strip-ansi')
module.exports.cleanLog = function (log) {
    log = stripAnsi(log).replace(/(?:\\[rn]|[\r\n])/g,'\n')
    const properties = [
        /(hostname:).*/g,
        /(version:).*/g,
        /(instance:).*/g,
        /(startup:).*/g,
        /(travis-build version:).*/g,
        /(process ).*/g,
        /(Get|Ign|Hit):[0-9]+/g,
    ]
    const toRemove = [
        // date
        /.{3}, +([0-9]+) +.{3} ([0-9]+) ([0-9]+):([0-9]+):([0-9]+) +\+([0-9]+)/g,
        /.{3}, +([0-9]+):([0-9]+):([0-9]+) \+([0-9]+)/g,
        /([0-9]+)\.([0-9]+):([0-9]+):([0-9]+)\.([0-9]+)/g,
        /([0-9]+)-([0-9]+)-([0-9]+) ([0-9]+):([0-9]+):([0-9]+)/g,
        /([0-9]+)\/([0-9]+)\/([0-9]+) ([0-9]+):([0-9]+):([0-9]+) (PM|AM)/g,
        /([0-9]+):([0-9]+):([0-9]+)/g,
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
        /([0-9\.]+) ?MB\/s/g,
        /([0-9\.]+)M=0s/g,
        /\[([0-9\,\.]+) ?k?M?B\]/g,
        /Fetched ([0-9\.]+) MB/g,
        /([0-9\.]+) seconds/g,
        /Reading package lists... ([0-9]+)%/g,
        / ... /g,
        /(▉|█|▋)/g,
        /Updating files: /g,
        /Thistake some time... done./g,
        // ip
        /([0-9\.]+).([0-9\.]+).([0-9\.]+).([0-9\.]+)/g,
        /[0-9]{1,2} ?%/g,
    ]
    for (let property of properties) {
        log = log.replace(property, '$1')
    }
    for (let property of toRemove) {
        log = log.replace(property, '')
    }
    output = []
    for (let line of log.split('\n')) {
        const trimmedLine = line.trim()
        if (trimmedLine.length == 0 || trimmedLine == '' || trimmedLine[1] == '%' || trimmedLine[2] == '%') {
            continue
        }
        output.push(line)
    }
    return output.join('\n')
}