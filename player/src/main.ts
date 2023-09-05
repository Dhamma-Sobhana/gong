import { randomUUID } from 'crypto'

import mqtt from "mqtt"
import BalenaAudio from 'balena-audio'

import { Player } from "./player";

const name = process.env.NAME || randomUUID()
const server = process.env.MQTT_SERVER || 'localhost'
const pulseServer = process.env.PULSE_SERVER || 'unix:/run/pulse/pulseaudio.socket'

const client  = mqtt.connect(`mqtt://${server}`);
const audioBlock = new BalenaAudio(pulseServer)

const zones = (process.env.ZONES || 'all').split(',')

// Instantiate player object
console.log(`[player] Gong player starting.\n\nName: ${name}\nZones: ${zones}\nServer: ${server}`)
const player = new Player(client, audioBlock, name, zones);