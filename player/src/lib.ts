import { GongType } from "./models";

const sound_base = './sound'

const gong_types: Array<GongType> = [
    {'name': 'brass-bowl', 'file_name': `${sound_base}/brass-bowl.mp3`},
    {'name': 'big-ben', 'file_name': `${sound_base}/big-ben.mp3`},
    {'name': 'big-gong', 'file_name': `${sound_base}/big-gong.mp3`},
    {'name': 'silence', 'file_name': `${sound_base}/silence.mp3`, 'test': true},
    {'name': 'beep', 'file_name': `${sound_base}/beep.mp3`, 'test': true}
]

const default_gong_type : GongType = gong_types[0]

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

/**
 * Get available gong types
 * @param test Include test gong types
 * @returns 
 */
function getGongTypes(test: boolean = false): Array<GongType> {
    if (!test)
        return gong_types.filter(x => x.test !== true)

    return gong_types
}

/**
 * Get gong type by name, or default if not found
 * @param name Name of gong type
 * @returns 
 */
function getGongTypeByName(name: string): GongType {
    let gong_type = gong_types.find(t => t.name === name)

    if (gong_type == undefined)
        return default_gong_type

    return gong_type
}


export { getLocations, parseJson, getGongTypes, getGongTypeByName }