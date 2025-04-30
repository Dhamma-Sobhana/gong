import { exec } from "child_process";

import * as Sentry from "@sentry/node";

import { DateTime } from "luxon";

import { DeviceStatus, PlayMessage, Status } from "./models"
import { Automation } from './automation';
import { aggregateDeviceStatus, numberOfActivePlayers, updateDevicesStatus } from './devices';
import { setupWebRoutes } from './web'
import { handleMessage as handleMqttMessage } from "./mqtt";

let client:any

/**
 * Gong server. Handle requests over MQTT and web
 */
class Server {
    enabled: boolean = true
    gongPlaying: boolean = false
    gongRepeat: number = 4
    devices: Array<DeviceStatus> = []
    unknownDevices: Array<DeviceStatus> = []
    automation: Automation
    deviceStatusTimer: NodeJS.Timer
    watchdog?: NodeJS.Timeout
    playTimeout?: NodeJS.Timeout = undefined

    /**
     * 
     * @param devices which devices should exist in the network
     * @param gongRepeat how many times a gong should be played
     */
    constructor(mqttClient:any, devices: Array<string>, gongRepeat: number = 4, automationEnabled:boolean = false, locationId?:number, enabled:boolean = true) {
        client = mqttClient
        this.enabled = enabled
        this.gongRepeat = gongRepeat
        this.automation = new Automation(this.playAutomatedGong, locationId, automationEnabled, this.gongRepeat)

        for (let device of devices) {
            this.devices.push(new DeviceStatus(device))
        }

        client.on('message', (topic: string, message: object) => {
            handleMqttMessage(topic, message.toString(), this)
            this.resetWatchdog()
        })

        setupWebRoutes(this, client)

        this.deviceStatusTimer = setInterval(() => {
            client.publish(`ping`);
            updateDevicesStatus(this.devices)
        }, 60000)

        console.log(`[server] Gong server starting. Required devices: ${this.devices}`)
        console.log(`[server] System time: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}`)

        this.resetWatchdog()
    }

    systemStatus() {
        let device_status = aggregateDeviceStatus(this.devices)

        if (!this.enabled) {
            return {
                overall: Status.Warning,
                reason: 'System disabled'
            }
        } else if (!client.connected) {
            return {
                overall: Status.Failed,
                reason: 'MQTT server not connected'
            }
        } else if (device_status.failed > 0) {
            return {
                overall: Status.Failed,
                reason: `${device_status.failed} device(s) offline`
            }
        } else if (device_status.warning > 0) {
            return {
                overall: Status.Warning,
                reason: `${device_status.failed} device(s) possibly offline`
            }
        } else if (this.automation.lastFetch == undefined) {
            return {
                overall: Status.Warning,
                reason: 'Course schedule not fetched'
            }
        }

        return {
            overall: Status.OK
        }
    }

    /**
     * Enable or disable system. Prevents gong from being played
     * based on manual remote or automation action.
     * @param disable optional to diasable automation
     */
    enable(enable?: boolean) {
        if (enable !== undefined && enable == false) {
            this.enabled = false
            console.log('[server] Disabled')
        } else {
            this.enabled = true
            console.log('[server] Enabled')
        }
    }

    destroy() {
        clearInterval(this.deviceStatusTimer)
        clearInterval(this.watchdog)
        clearTimeout(this.playTimeout)
        this.automation.cancel()
        client.end()
    }


    /**
     * Play gong or stop if already playing
     * Only executes if system is enabled and there is at least 1 player active
     * @param location where to play
     * @param repeatGong how many times gong should be played
     */
    playGong(location:Array<string>, repeatGong: number) {
        if (!this.enabled)
            return false

        if (this.gongPlaying) {
            this.stop()
        } else {
            // Only send play message if there are player devices online
            if (numberOfActivePlayers(this.devices) < 1) {
                console.log(`[server] No players are active. Action not performed`)
                return
            }

            let message = JSON.stringify(new PlayMessage('gong', location, repeatGong))

            // If no player reports playback started within 5 seconds after message sent,
            // send stop to inform remotes
            clearTimeout(this.playTimeout)
            this.playTimeout = setTimeout( async () => {
                console.log(`[server] No player reported starting playback`)
                client.publish('stop')
                this.gongPlaying = false
            }, 5000);
            
            client.publish('play', message)
            console.debug(`[mqtt] > play: ${message}`)
            console.log(`[server] Start playing`)

            this.gongPlaying = true
        }
    }

    stop() {
        client.publish('stop')
        console.debug(`[mqtt] > stop`)
        console.log(`[server] Stop playing`)
        this.gongPlaying = false
    }

    /**
     * Log if gong was playing and set playing to false
     */
    played() {
        if (this.gongPlaying == true)
            console.log(`[server] Finished playing`)

        this.gongPlaying = false
    }

    /**
     * Called by automation. Only play if not already playing
     * @param location where to play
     */
    playAutomatedGong = (location:Array<string>, repeat:number) => {
        if (!this.enabled)
            return

        if (!this.gongPlaying)
            this.playGong(location, repeat)
    }

    /**
     * Watchdog that unless reset, will restart the device if no messages have been
     * received 10 minutes. Will hopefully fix some network issues
     */
    resetWatchdog = () => {
        clearTimeout(this.watchdog)
        this.watchdog = setTimeout( async () => {
            let message = "[server] No message received in 10 minutes, resetting device"
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

export { Server }