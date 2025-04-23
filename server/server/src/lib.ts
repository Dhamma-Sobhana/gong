import { DateTime } from "luxon";
import { readManualEntries } from "./storage";
import { ManualEntry } from "./models";

/**
* Get the locations that was received that the player also handles
* @param playerLocations Locations the player handles
* @param messageLocations Locations in the message
* @returns Locations that exists in both arrays or ['all']
*/
function getLocations(playerLocations: Array<string>, messageLocations: Array<string>): Array<string> {
    if (playerLocations.includes('all') || messageLocations.includes('all'))
        return ['all'];

    return playerLocations.filter((x) => messageLocations.includes(x));
}

/**
 * Get location to play gong based on time of day, configured in manual.json
 * @param dateTime optional DateTime object, if not provided current time is used
 * @returns ManualEntry object with from time, to time, locations and repeat
 */
function getManualEntry(dateTime?: DateTime): ManualEntry {
    if (dateTime == undefined)
        dateTime = DateTime.now()

    const isoTime = dateTime.toISOTime();
    
    if (isoTime == null)
        return new ManualEntry('00:00', '23:59', [], 0);

    let manualEntries = readManualEntries()

    for (let entry of manualEntries) {
        let from = entry.from.toISOTime()
        let to = entry.to.toISOTime()

        if ((from && from <= isoTime) && (to && isoTime < to)) {
            return entry
        }
    }

    return new ManualEntry('00:00', '23:59', [], 0);
}

/**
 * Try to parse a message object to JSON
 * @param message The JSON string
 * @returns JSON object or undefined
 */
function parseJson(message: string) {
    try {
        return JSON.parse(message)
    } catch {
        return undefined
    }
}

export { getLocations, getManualEntry, parseJson }
