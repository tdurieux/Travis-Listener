const stripAnsi = require('strip-ansi')

const properties = [
    /(hostname:).*/g,
    /(version:).*/g,
    /(instance:).*/g,
    /(startup:).*/g,
    /(travis-build version:).*/g,
    /(process ).*/g,
    // /(Get|Ign|Hit):[0-9]+/g,
]
const startWith = [
    'Get',
    'Ing',
    'Hit',
    'Receiving objects:',
    'Resolving deltas:',
    'Unpacking objects:',
    'Reading package lists...',
    'Fetched',
    'Updating files:',
    'This take some time...',
    'travis_time:',
    'travis_fold',
    'remote:',
    '/home/travis/',
    '...'
]
const toRemove = [
    // date
    /.{3}, +([0-9]+) +.{3} ([0-9]+) ([0-9]+):([0-9]+):([0-9]+) +\+([0-9]+)/g,
    /.{3}, +([0-9]+):([0-9]+):([0-9]+) \+([0-9]+)/g,
    /([0-9]+)\.([0-9]+):([0-9]+):([0-9]+)\.([0-9]+)/g,
    /([0-9]+)-([0-9]+)-([0-9]+) ([0-9]+):([0-9]+):([0-9]+)/g,
    /([0-9]+)\/([0-9]+)\/([0-9]+) ([0-9]+):([0-9]+):([0-9]+) (PM|AM|pm|am)/g,
    /([0-9]+):([0-9]+):([0-9]+)/g,
    // travis stuffs
    /\(([0-9]+)\/([0-9]+)\)/g,
    // ids
    /([0-9]{5,})/g,
    /([0-9a-f]{10,})/g,
    // time
    /in .*s/gi,
    /(-->) +([0-9]+)%/g,
    /([0-9]+)ms/gi,
    /([0-9\.]+) ?MB\/s/gi,
    /([0-9\.]+)M=0s/gi,
    /\[([0-9\,\.]+) ?k?M?B\]/gi,
    /([0-9\.]+) (seconds|secs)/g,
    /(▉|█|▋)+/g,
    /\[[0-9]+\/[0-9]+\]/,
    // ip
    /([0-9\.]+).([0-9\.]+).([0-9\.]+).([0-9\.]+)/g,
    /[0-9]{1,2} ?%/g,
]

function isEmpty(str) {
    const trimmedLine = str.trim()
    if (trimmedLine.length == 0 || trimmedLine == '' || trimmedLine[1] == '%' || trimmedLine[2] == '%') {
        return true;
    }
    return false;
}

module.exports.cleanLog = function (log) {
    const hrstart = process.hrtime()

    const output = []

    log = stripAnsi(log).replace(/(?:\\[rn]|[\r\n])/g,'\n')
    const lines = log.split('\n')
    line: for (let line of lines) {
        if(isEmpty(line)) {
            continue;
        }
        for (let property of startWith) {
            if (line.indexOf(property) > -1) {
                continue line;
            }
        }
        for (let property of properties) {
            line = line.replace(property, '$1')
        }
        for (let property of toRemove) {
            line = line.replace(property, '')
        }
        if(isEmpty(line)) {
            continue line;
        }
        output.push(line)
    }
    const out = output.join('\n')
    var hrend = process.hrtime(hrstart)
    console.info('Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000)
    return out;
}