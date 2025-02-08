import { exec } from "child_process";

import * as Sentry from "@sentry/node";

import { Request, Response } from 'express';
import { DateTime } from "luxon";

import { DeviceStatus, PlayMessage } from "./models"
import { parseJson } from './lib'
import { logArray } from './log'
import { app } from './web'
import { Automation } from './automation';
import { aggregateDeviceStatus, numberOfActivePlayers, updateDevice, updateDevicesStatus } from './devices';

let client:any

/**
 * Gong server. Handle requests over MQTT and web
 */
class Server {
    enabled: boolean = true
    gongPlaying: boolean = false
    gongRepeat: number = 4
    devices: Array<DeviceStatus> = []
    automation: Automation
    deviceStatusTimer: NodeJS.Timer
    watchdog?: NodeJS.Timeout

    /**
     * 
     * @param devices which devices should exist in the network
     * @param gongRepeat how many times a gong should be played
     */
    constructor(mqttClient:any, devices: Array<string>, gongRepeat: number = 4, automationEnabled:boolean = false, locationId?:number) {
        client = mqttClient
        this.gongRepeat = gongRepeat
        this.automation = new Automation(this.playAutomatedGong, locationId, automationEnabled)

        for (let device of devices) {
            this.devices.push(new DeviceStatus(device))
        }

        client.on('message', (topic: string, message: object) => {
            this.handleMessage(topic, message.toString())
            this.resetWatchdog()
        })

        app.get('/', (req: Request, res: Response) => {
            res.render('index.njk', {
                enabled: this.enabled,
                devices: this.devices,
                device_status: aggregateDeviceStatus(this.devices),
                playing: this.gongPlaying,
                log: logArray.slice(),
                automation: this.automation,
                system_time: DateTime.now()
            })
        })

        app.post('/enable', (req: Request, res: Response) => {
            console.log('[web] Enable/Disable')
            this.enable(!this.enabled)
            res.redirect('/')
        })

        app.post('/activated', (req: Request, res: Response) => {
            console.log('[web] Play/Stop')
            this.playGong(["all"], this.gongRepeat)
            res.redirect('/')
        })

        app.post('/ping', (req: Request, res: Response) => {
            console.log('[web] Refresh')
            client.publish(`ping`);
            res.redirect('/')
        })

        app.post('/automation/enable', (req: Request, res: Response) => {
            console.log('[web] Automation enabled')
            this.automation.enable()
            res.redirect('/')
        })

        app.post('/automation/disable', (req: Request, res: Response) => {
            console.log('[web] Automation disabled')
            this.automation.enable(false)
            res.redirect('/')
        })

        app.post('/automation/entry/enable', (req: Request, res: Response) => {
            let entryDateTime = DateTime.fromISO(req.body.entry_id)
            console.log(`[web] Automation enable entry: ${entryDateTime}`)

            this.automation.schedule.setTimeTableEntryStatus(entryDateTime, true)
            this.automation.scheduleGong(this.automation.getNextGong())
            res.redirect('/')
        })

        app.post('/automation/entry/disable', (req: Request, res: Response) => {
            let entryDateTime = DateTime.fromISO(req.body.entry_id)
            console.log(`[web] Automation disable entry: ${entryDateTime}`)

            this.automation.schedule.setTimeTableEntryStatus(entryDateTime, false)
            this.automation.scheduleGong(this.automation.getNextGong())
            res.redirect('/')
        })

        this.deviceStatusTimer = setInterval(() => {
            client.publish(`ping`);
            updateDevicesStatus(this.devices)
        }, 60000)

        console.log(`[server] Gong server starting. Required devices: ${this.devices}`)
        console.log(`[server] System time: ${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}`)

        this.resetWatchdog()
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
            client.publish('stop')
            console.debug(`[mqtt] > stop`)
            console.log(`[server] Stop playing`)
        } else {
            // Only send play message if there are player devices online
            if (numberOfActivePlayers(this.devices) < 1) {
                console.log(`[server] No players are active. Action not performed`)
                return
            }

            let message = JSON.stringify(new PlayMessage(location, repeatGong))
            client.publish('play', message)
            console.debug(`[mqtt] > play: ${message}`)
            console.log(`[server] Start playing`)
        }

        this.gongPlaying = !this.gongPlaying
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
    playAutomatedGong = (location:Array<string>) => {
        if (!this.enabled)
            return

        if (!this.gongPlaying)
            this.playGong(location, this.gongRepeat)
    }

    /**
     * Handle subscribed messages received
     * @param topic MQTT topic
     * @param message if any, in JSON format
     */
    handleMessage = (topic: string, message: string) => {
        //console.debug(`[mqtt] < ${topic}: ${message}`)

        // Parse message to JSON, if any
        let data = parseJson(message)

        switch (topic) {
            case 'activated':
                console.log(`[remote] Action initiated by ${data.name}`)
                this.playGong(["all"], this.gongRepeat)
                break;
            case 'played':
                this.played()
                data.locations = undefined // To not overwrite locations in device list
                break;
            default:
                break;
        }

        // Update device list based on message
        updateDevice(data, this.devices)
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