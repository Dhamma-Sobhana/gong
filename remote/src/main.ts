import { randomUUID } from 'crypto'

import { Gpio } from 'onoff'
import mqtt from "mqtt"

import { Remote } from './remote'

const name = process.env.NAME || randomUUID()
const server = process.env.MQTT_SERVER || 'localhost'
const ledPin = process.env.LED_PIN !== undefined ? parseInt(process.env.LED_PIN) : 3
const buttonPin = process.env.BUTTON_PIN !== undefined ? parseInt(process.env.BUTTON_PIN) : 2
const ledGpio = new Gpio(ledPin, 'out');
const buttonGpio = new Gpio(buttonPin, 'in', 'both');

const client  = mqtt.connect(`mqtt://${server}`);

console.log(`[remote] Gong remote starting.\n\nName: ${name}\nServer: ${server}`)
const button = new Remote(client, ledGpio, buttonGpio);