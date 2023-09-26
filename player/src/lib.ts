/**
* Get the locations that was received that the player also handles
* @param playerLocations Locations the player handles
* @param messageLocations Locations in the message
* @returns Locations in both arrays or ['all'] if it was received
*/
function getLocations(playerLocations: Array<string>, messageLocations: Array<string>):Array<string> {
    if (playerLocations.includes('all') || messageLocations.includes('all'))
        return ['all'];

    return playerLocations.filter((x) => messageLocations.includes(x));
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

export { getLocations, parseJson }