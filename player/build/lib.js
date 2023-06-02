//import { networkInterfaces } from "os";
/**
 * Check for interfaces that looks like physical ones and return the first found mac address.
 * @returns: mac address string or false
 */
// function getMac() {
//     const validInterfaces = ["eth0", "en0", "wlan0"];
//     let interfaces = networkInterfaces();
//     for (const netInterface of validInterfaces) {
//         if (netInterface in interfaces) {
//             return interfaces[netInterface][0].mac;
//         }
//     }
// }
/**
 * Format time with timezone and ISO format
 * @param {Date} dateTime
 * @returns Formatted string in ISO format using time zone
 */
export const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString("sv", { timeZoneName: "short" });
};
/**
 * Get the zones that was received that the player also handles
 * @param {Array} playerZones Zones the player handles
 * @param {Array} messageZones Zones in the message
 * @returns {Array} Zones in both arrays or ['all'] if it was received
 */
export const getZones = (playerZones, messageZones) => {
    if (playerZones.includes('all') || messageZones.includes('all'))
        return ['all'];
    return playerZones.filter((x) => messageZones.includes(x));
};
//module.exports = { formatDateTime, getZones };
