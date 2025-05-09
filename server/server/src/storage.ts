import { DateTime } from "luxon";
import { DisabledEntries, ManualEntry } from "./models";
import path from "path";

const fs = require('fs');

function getFilePath() {
    if (['test', 'development'].includes(process.env.NODE_ENV || ''))
        return '.'
    else
        return '/data'
}

/**
 * Path to schedule cache
 * @returns file path and name
 */
function getCacheFilePath() {
    return `${getFilePath()}/schedule.json`
}

function getSettingsFilePath() {
    return `${getFilePath()}/settings.json`
}

function getManualFilePath() {
    return path.resolve(__dirname, `../resources/manual.json`)
}

function readManualEntries():Array<ManualEntry> {
    let jsonManual = JSON.parse(fs.readFileSync(getManualFilePath()))

    let manual = jsonManual.map((entry: { from: string, to: string, locations: Array<string>, repeat: number }) =>
        new ManualEntry(entry.from, entry.to, entry.locations, entry.repeat)
    )

    return manual
}


/**
 * Read settings file from disk, if any
 * @returns json object of read file or an empty dictionary
 */
function readSettings() {
    if (fs.existsSync(getSettingsFilePath())) {
        console.log(`[server] Reading settings from disk, ${getSettingsFilePath()}`)
        return JSON.parse(fs.readFileSync(getSettingsFilePath()))
    }

    return {}
}

function writeSettings(settings:any) {
    fs.writeFileSync(getSettingsFilePath(), JSON.stringify(settings));
}

function readDisabledEntries() {
    let settings = readSettings()

    if (settings && 'disabledEntries' in settings)
        return new DisabledEntries(settings.disabledEntries.map((entry: string) => DateTime.fromISO(entry)))

    return new DisabledEntries()
}

function writeDisabledEntries(disabledEntries?:DisabledEntries) {
    if (!disabledEntries)
        return

    let settings = readSettings()
    
    disabledEntries.cleanup()

    settings['disabledEntries'] = disabledEntries.entries

    writeSettings(settings)
}

export {
    getCacheFilePath,
    getSettingsFilePath,
    readSettings,
    readManualEntries,
    writeSettings,
    readDisabledEntries,
    writeDisabledEntries
}
