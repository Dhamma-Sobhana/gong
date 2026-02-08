import * as Sentry from "@sentry/node";

import { randomUUID } from 'crypto'

import { Gpio } from 'onoff'
import mqtt from "mqtt"

import { Remote } from './remote'

if (process.env.SENTRY_DSN) {
    console.log('[remote] Sentry error handling activated')
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || "production",
    });
}

const name = process.env.NAME || randomUUID()
const disabled = process.env.DISABLED !== undefined ? process.env.DISABLED == 'true' : false
const server = process.env.MQTT_SERVER || 'mqtt'
const baseGpioAddress = process.env.GPIO_BASE_ADDRESS !== undefined ? parseInt(process.env.GPIO_BASE_ADDRESS) : 512
const ledPin = process.env.LED_PIN !== undefined ? baseGpioAddress + parseInt(process.env.LED_PIN) : baseGpioAddress + 3
const buttonPin = process.env.BUTTON_PIN !== undefined ? baseGpioAddress + parseInt(process.env.BUTTON_PIN) : baseGpioAddress + 2
const ledGpio = new Gpio(ledPin, 'out');
const buttonGpio = new Gpio(buttonPin, 'in', 'both');

const client = mqtt.connect(`mqtt://${server}`, {
    'username': 'mqtt',
    'password': `${process.env.MQTT_PASSWORD}`,
    'queueQoSZero': false,
    'keepalive': 5,
})

console.log(`[remote] Gong remote starting.\n\nName: ${name}\nServer: ${server}`)
const button = new Remote(client, ledGpio, buttonGpio, disabled);