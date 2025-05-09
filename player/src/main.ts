import { randomUUID } from 'crypto'

import * as Sentry from "@sentry/node";
import mqtt from "mqtt"
import BalenaAudio from 'balena-audio'

import { Player } from "./player";

if (process.env.SENTRY_DSN) {
    console.log('[player] Sentry error handling activated')
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || "production",
    });
}

const name = process.env.NAME || randomUUID()
const disabled = process.env.DISABLED !== undefined ? process.env.DISABLED == 'true' : false
const server = process.env.MQTT_SERVER || 'mqtt'
const pulseServer = process.env.PULSE_SERVER || 'unix:/run/pulse/pulseaudio.socket'

const client = mqtt.connect(`mqtt://${server}`, {
    'username': 'mqtt',
    'password': `${process.env.MQTT_PASSWORD}`,
})

const audioBlock = new BalenaAudio(pulseServer, false, 'gong')

const locations = (process.env.LOCATIONS || 'all').split(',')

// Instantiate player object
console.log(`[player] Gong player starting.\n\nName: ${name}\nLocations: ${locations}\nServer: ${server}`)
const player = new Player(client, audioBlock, name, locations, disabled);