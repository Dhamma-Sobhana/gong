import { Request, Response } from 'express';

import { DeviceStatus, Message, PlayMessage } from "./models"
import { parseJson } from './lib'
import { logArray } from './log'
import { app } from './web'
import { client } from './mqtt'

/**
 * Update device list
 * @param data object received
 * @param devices list of devices
 */
function updateDevice(data:object, devices:Array<DeviceStatus>) {
  let message = Object.assign(new Message(), data)

  if (message.name === undefined)
    return

  for (let device of devices) {
    if (device.name == message.name) {
      device.update(message.type, message.zones)
    }
  }
}

/**
 * Handle remote button press
 * @param gongPlaying current state
 * @param repeatGong how many times gong should be played
 * @returns reversed state
 */
function remoteAction(gongPlaying:boolean, repeatGong:number):boolean  {
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
function played(gongPlaying:boolean):boolean {
  if (gongPlaying == true)
    console.log(`[server] Finished playing`)

  return false
}

/**
 * Gong server. Handle requests over MQTT and web
 */
class Server {
  gongPlaying: boolean = false
  gongRepeat: number = 4
  devices: Array<DeviceStatus> = []

  /**
   * 
   * @param devices which devices should exist in the network
   * @param gongRepeat how many times a gong should be played
   */
  constructor(devices: Array<string>, gongRepeat:number = 4) {
    this.gongRepeat = gongRepeat

    for (let device of devices) {
      this.devices.push(new DeviceStatus(device))
    }

    client.on('message', (topic: string, message: object) => {
      this.handleMessage(topic, message)
    })

    app.get('/', (req: Request, res: Response) => {
      res.render('index.njk', {devices: this.devices, playing: this.gongPlaying, log: logArray})
    })

    app.post('/activated', (req, res) => {
      console.log('[web] Play/Stop')
      this.gongPlaying = remoteAction(this.gongPlaying, this.gongRepeat)
      res.redirect('/')
    })

    app.post('/ping', (req, res) => {
      console.log('[web] Refresh')
      client.publish(`ping`);
      res.redirect('/')
    })

    console.log(`[server] Gong server starting. Required devices: ${this.devices}`)
  }

  /**
   * Handle subscribed messages received
   * @param topic MQTT topic
   * @param message if any, in JSON format
   */
  handleMessage = (topic: string, message: object) => {
    console.debug(`[mqtt] < ${topic}: ${message.toString()}`)

    // Parse message to JSON, if any
    let data = parseJson(message)

    switch (topic) {
      case 'activated':
        this.gongPlaying = remoteAction(this.gongPlaying, this.gongRepeat)
        break;
      case 'played':
        this.gongPlaying = played(this.gongPlaying)
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