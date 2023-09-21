import { Server } from "./server";
import { client } from "./mqtt";

process.env.TZ = 'Europe/Stockholm'

const gongRepeat = process.env.GONG_REPEAT !== undefined ? parseInt(process.env.GONG_REPEAT) : 4
const automationEnabled = process.env.AUTOMATION !== undefined ? process.env.AUTOMATION == 'true' : false
const locationId = process.env.LOCATION_ID !== undefined ? parseInt(process.env.LOCATION_ID) : undefined

// Instantiate server object
const server = new Server(client, (process.env.DEVICES || '').split(','), gongRepeat, automationEnabled, locationId);