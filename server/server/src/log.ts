import { DeviceStatus } from "./models"

let logArray: Array<string> = []

/**
 * Override console.log to save messages in memory cache and write to console.
 * Limit number of messages to 10
 */
let _consoleLog = console.log;
console.log = function () {
    let message = Array.prototype.slice.apply(arguments).join(' ')

    if (logArray.length >= 10)
        logArray.shift()

    let now = new Date().toLocaleString('sv-SE')
    logArray.push(`${now}: ${message}`)
    _consoleLog(message)
}

export { logArray }