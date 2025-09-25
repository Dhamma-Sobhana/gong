let logArray: Array<string> = []

const maxLogLines = 100

/**
 * Override console.log to save messages in memory cache and write to console.
 * Limit number of messages to maxLogLines
 */
let _consoleLog = console.log;
console.log = function () {
    let message = Array.prototype.slice.apply(arguments).join(' ')

    if (logArray.length >= maxLogLines)
        logArray.shift()

    let now = new Date().toLocaleString('sv-SE')
    logArray.push(`${now}: ${message}`)
    _consoleLog(message)
}

export { logArray }