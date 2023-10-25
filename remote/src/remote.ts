import { exec } from "child_process";

import * as Sentry from "@sentry/node";

import { MqttClient } from 'mqtt'
import { BinaryValue, Gpio } from 'onoff'

import { parseJson } from './lib'
import { Message } from './models'

let name = process.env.NAME

// Configuration
const threasholdActivate = 2000;
const threasholdCancel = 40;
const initialToggleTime = 300;
const minToggleTime = 100;
const toggleDelta = 30;

// MQTT
let topics = ['ping', 'play', 'played', 'stop']

class Remote {
    client: MqttClient
    led: Gpio
    button: Gpio

    active: BinaryValue = 0
    toggle: BinaryValue = 0
    pressTime: number = Date.now()
    timeout?: NodeJS.Timeout = undefined
    toggleTime: number = 0
    watchdog?: NodeJS.Timeout
    error?: NodeJS.Timeout = undefined

    constructor(client: MqttClient, ledGpio: Gpio, buttonGpio: Gpio) {
        this.client = client
        this.led = ledGpio
        this.button = buttonGpio

        this.led.writeSync(this.toggle);
        this.button.watch((err, value) => this.buttonChanged(err, value))

        // Blink led until connected
        this.errorMode()

        this.client.on('connect', () => {
            this.cancelErrorMode()
            this.mqttConnect()
        })

        this.client.on('message', (topic: string, message: Buffer) => {
            this.mqttMessage(topic, message.toString())
            this.resetWatchdog()
        })

        this.client.on('error', err => {
            this.errorMode()
        })

        this.client.on('reconnect', () => {
            this.errorMode()
        })


        this.resetWatchdog()
    }

    destroy() {
        clearInterval(this.timeout)
        clearInterval(this.watchdog)
        clearInterval(this.error)
    }

    /**
     * Subscribe to topics and send alive message
     */
    mqttConnect = () => {
        console.log('[remote] Connected! Listening for topics:', topics.join(', '))
        for (let topic of topics) {
            this.client.subscribe(topic)
        }

        // Send message telling that the device is alive
        this.sendPong()
    }

    /**
     * Handle subscribed messages received
     * @param topic MQTT topic
     * @param message MQTT message, if any
     */
    mqttMessage = (topic: string, message: string) => {
        //console.debug(`[mqtt] < ${topic}: ${message}`)

        // Parse message to JSON, if any
        let data = parseJson(message)

        if (topic === 'ping') {
            this.sendPong()
        } else if (topic === 'stop' || topic === 'played') {
            this.active = 0;
            this.led.writeSync(this.active);
        } else if (topic === 'play') {
            this.active = 1;
            this.led.writeSync(this.active);
        }
    }

    /**
     * Send activated message to server
     */
    sendButtonState = () => {
        let message = JSON.stringify(new Message(name))
       
        this.client.publish('activated', message);
    }

    /**
     * Button state changed.
     * Activate led and start alternating timer
     */
    buttonChanged = (err: Error | null | undefined, value: BinaryValue) => {
        if (err) {
            throw err;
        }

        if (value == Gpio.LOW) { //  Button presseed            
            if (this.timeout !== undefined)
                return;

            this.pressTime = Date.now();
            this.reset();

            this.timeout = setTimeout(this.alternate, this.toggleTime);
            this.led.writeSync(Gpio.HIGH);
            //console.log('[remote] Button pressed');
        } else { // Button released
            this.reset();
            //console.log('[remote] Button released');
            this.led.writeSync(this.active);
        }
    }

    /**
     * Cancel timer and restore toggle time
     */
    reset() {
        clearTimeout(this.timeout);
        this.timeout = undefined;
        if (this.active)
            this.toggleTime = minToggleTime;
        else
            this.toggleTime = initialToggleTime;
    }

    /**
     * Change the length of time in current state
     */
    updateToggleTime() {
        let toggleTime = this.toggleTime;
        let active = this.active;

        if (active)
            toggleTime += toggleDelta;
        else
            toggleTime -= toggleDelta;

        if (toggleTime < minToggleTime)
            toggleTime = minToggleTime;
        else if (toggleTime > initialToggleTime)
            toggleTime = initialToggleTime;

        this.toggleTime = toggleTime;
    }

    /**
     * Toggle state
     */
    toggleState() {
        if (this.toggle == 0)
            this.toggle = 1
        else
            this.toggle = 0
    }

    /**
     * Change led state or active state if button held long enough
     * Important that this is defined as an arrow function so that
     * other methods in this class can be called.
     */
    alternate = () => {
        // Hold for long enough
        let threashold = this.active ? threasholdCancel : threasholdActivate

        if (Date.now() > (this.pressTime + threashold)) {
            if (this.active) {
                console.log('[remote] State deactivated');
            } else {
                console.log('[remote] State activated');
            }

            this.sendButtonState();

            this.led.writeSync(0);
            clearTimeout(this.timeout);
            return;
        }

        // Blink led
        this.toggleLed()
        this.updateToggleTime();
        this.timeout = setTimeout(this.alternate, this.toggleTime);
    }

    sendPong() {
        let message = JSON.stringify(new Message(name, 'remote'))
        this.client.publish(`pong`, message);
    }

    /**
     * Toggle LED
     */
    toggleLed = () => {
        this.toggleState();
        this.led.writeSync(this.toggle);
    }

    /**
     * Cancel blinking LED
     */
    cancelErrorMode() {
        if (this.error !== undefined) {
            clearInterval(this.error)
            this.error = undefined
        }

        this.active = 0
        this.led.writeSync(this.active)
    }

    /**
     * Blink LED every second
     */
    errorMode() {
        if (this.error == undefined) {
            this.error = setInterval(this.toggleLed, 1000)
        }
    }

    /**
     * Watchdog that unless reset, will restart the device if no messages have been
     * received 10 minutes. Will hopefully fix some network issues
     */
    resetWatchdog = () => {
        clearTimeout(this.watchdog)
        this.watchdog = setTimeout( async () => {
            let message = "[remote] No message received in 10 minutes, resetting device"
            console.error(message)
            Sentry.captureMessage(message)
            await Sentry.flush()
            
            exec('DBUS_SYSTEM_BUS_ADDRESS=unix:path=/host/run/dbus/system_bus_socket \
                dbus-send \
                --system \
                --print-reply \
                --dest=org.freedesktop.systemd1 \
                /org/freedesktop/systemd1 \
                org.freedesktop.systemd1.Manager.Reboot', (err, output) => {
                    if (err) {
                        console.error("Failed to reboot device")
                    } else {
                        console.log("Device rebooting")
                    }
                })
        }, 10*60*1000)
    }
}

export { Remote }