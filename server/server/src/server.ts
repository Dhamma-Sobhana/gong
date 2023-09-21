import { Request, Response } from 'express';

import { DeviceStatus, PlayMessage } from "./models"
import { parseJson } from './lib'
import { logArray } from './log'
import { app } from './web'
import { Automation } from './automation';
import { aggregateDeviceStatus, updateDevice, updateDevicesStatus } from './devices';

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

    /**
     * 
     * @param devices which devices should exist in the network
     * @param gongRepeat how many times a gong should be played
     */
    constructor(mqttClient:any, devices: Array<string>, gongRepeat: number = 4, automationEnabled:boolean = false, locationId?:number) {
        client = mqttClient
        this.gongRepeat = gongRepeat
        this.automation = new Automation(this.playAutomatedGong, locationId)
        this.automation.enable(automationEnabled)

        for (let device of devices) {
            this.devices.push(new DeviceStatus(device))
        }

        client.on('message', (topic: string, message: object) => {
            this.handleMessage(topic, message.toString())
        })

        app.get('/', (req: Request, res: Response) => {
            res.render('index.njk', { enabled: this.enabled, devices: this.devices, device_status: aggregateDeviceStatus(this.devices), playing: this.gongPlaying, log: logArray.reverse(), automation: this.automation })
        })

        app.post('/enable', (req: Request, res: Response) => {
            console.log('[web] Enable/Disable')
            this.enable(!this.enabled)
            res.redirect('/')
        })

        app.post('/activated', (req: Request, res: Response) => {
            console.log('[web] Play/Stop')
            this.gongPlaying = this.remoteAction(this.gongPlaying, this.gongRepeat)
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

        this.deviceStatusTimer = setInterval(() => {
            client.publish(`ping`);
            updateDevicesStatus(this.devices)
        }, 60000)

        console.log(`[server] Gong server starting. Required devices: ${this.devices}`)
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
        this.automation.cancel()
        client.end()
    }


    /**
     * Handle remote button press
     * @param gongPlaying current state
     * @param repeatGong how many times gong should be played
     * @returns reversed state
     */
    remoteAction(gongPlaying: boolean, repeatGong: number): boolean {
        if (!this.enabled)
            return false

        if (gongPlaying) {
            client.publish('stop')
            console.debug(`[mqtt] > stop`)
            console.log(`[server] Stop playing`)
        } else {
            let message = JSON.stringify(new PlayMessage(["all"], repeatGong))
            client.publish('play', message)
            console.debug(`[mqtt] > play: ${message}`)
            console.log(`[server] Start playing`)
        }

        return !gongPlaying
    }

    /**
     * Log if gong was playing
     * @param gongPlaying current state
     * @returns false
     */
    played(gongPlaying: boolean): boolean {
        if (gongPlaying == true)
            console.log(`[server] Finished playing`)

        return false
    }

    playAutomatedGong(location:Array<string>) {
        if (!this.enabled)
            return

        let message = JSON.stringify(new PlayMessage(location, this.gongRepeat))
        client.publish('play', message)
        console.debug(`[mqtt] > play: ${message}`)
    }

    /**
     * Handle subscribed messages received
     * @param topic MQTT topic
     * @param message if any, in JSON format
     */
    handleMessage = (topic: string, message: string) => {
        console.debug(`[mqtt] < ${topic}: ${message}`)

        // Parse message to JSON, if any
        let data = parseJson(message)

        switch (topic) {
            case 'activated':
                console.log(`[remote] Playback initiated by ${data.name}`)
                this.gongPlaying = this.remoteAction(this.gongPlaying, this.gongRepeat)
                break;
            case 'played':
                this.gongPlaying = this.played(this.gongPlaying)
                data.zones = undefined // To not overwrite zones in device list
                break;
            default:
                break;
        }

        // Update device list based on message
        updateDevice(data, this.devices)
    }
}

export { Server }