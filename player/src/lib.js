const { networkInterfaces } = require("os");

/**
 * Check for interfaces that looks like physical ones and return the first found mac address.
 * @returns: mac address string or false
 */
function getMac() {
    const validInterfaces = ["eth0", "en0", "wlan0"];
    let interfaces = networkInterfaces();

    for (const interface of validInterfaces) {
        if (interface in interfaces) {
            return interfaces[interface][0].mac;
        }
    }
}

/**
 * Format time with timezone and ISO format
 * @param {Date} dateTime
 * @returns Formatted string in ISO format using time zone
 */
function formatDateTime(dateTime) {
    return new Date(dateTime).toLocaleString("sv", { timeZoneName: "short" });
}

/**
 * Return new array containing all areas both handled and requested or [0] if included in request
 * @param {Array} requestedAreas
 * @returns Array of intersection of areas or [0]
 */
function getAffectedAreas(requestedAreas) {
    if (requestedAreas.includes(0)) return [0];

    return areas.filter((x) => requestedAreas.includes(x));
}

module.exports = { getMac, formatDateTime, getAffectedAreas };
