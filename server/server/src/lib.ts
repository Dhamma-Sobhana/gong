/**
* Get the zones that was received that the player also handles
* @param {Array} playerZones Zones the player handles
* @param {Array} messageZones Zones in the message
* @returns {Array} Zones in both arrays or ['all'] if it was received
*/
function getZones(playerZones : Array<string>, messageZones : Array<string>) {
    if (playerZones.includes('all') || messageZones.includes('all'))
        return ['all'];

    return playerZones.filter((x) => messageZones.includes(x));
}

/**
 * Try to parse a message object to JSON
 * @param message The JSON string
 * @returns JSON object or undefined
 */
function parseJson(message:string) {
    try {
        return JSON.parse(message)
    } catch {
        return undefined
    }
}

export { getZones, parseJson }