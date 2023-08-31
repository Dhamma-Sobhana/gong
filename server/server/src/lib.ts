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

export { parseJson }