import * as Sentry from "@sentry/node";

import { Server } from "./server";
import { client } from "./mqtt";
import { default_gong_type, getGongTypeByName } from "./lib";

if (process.env.SENTRY_DSN) {
    console.log('[server] Sentry error handling activated')
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || "production",
    });
}

process.env.TZ = 'Europe/Stockholm'

const gongRepeat = process.env.GONG_REPEAT !== undefined ? parseInt(process.env.GONG_REPEAT) : 4
const gongType = process.env.GONG_TYPE !== undefined ? getGongTypeByName(process.env.GONG_TYPE) : default_gong_type
const enabled = process.env.DISABLED !== undefined ? !(process.env.DISABLED == 'true') : true
const automationEnabled = process.env.AUTOMATION !== undefined ? process.env.AUTOMATION == 'true' : false
const locationId = process.env.LOCATION_ID !== undefined ? parseInt(process.env.LOCATION_ID) : undefined

// Instantiate server object
const server = new Server(client, (process.env.DEVICES || '').split(','), gongRepeat, gongType, automationEnabled, locationId, enabled);