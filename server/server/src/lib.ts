/**
 * Try to parse a message object to JSON
 * @param message The JSON string
 * @returns JSON object or undefined
 */
function parseJson(message:object) {
    try {
        return JSON.parse(message.toString())
    } catch {
        return undefined
    }
}

export { parseJson }