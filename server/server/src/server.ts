import { Request, Response } from 'express';

import { Message, DeviceStatus, PlayMessage } from './models'
import { logArray, printDevicesStatus } from './log'
import { app } from './web'
import { client } from './mqtt'

process.env.TZ = 'Europe/Stockholm'

const repeatGong = process.env.GONG_REPEAT !== undefined ? parseInt(process.env.GONG_REPEAT) : 1

/**
 * Try to parse a message object to JSON
 * @param message The JSON string
 * @returns JSON object or undefined
 */
function parseJson(message:object) {
  try {
    return JSON.parse(message.toString())
  } catch {
    return undefined
  }
}

class Server {
  gongPlaying: boolean = false
  devices: Array<DeviceStatus> = []

  constructor(devices: Array<string>) {
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
      this.remoteAction()
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
        this.remoteAction()
        break;
      case 'played':
        this.played()
        data.zones = undefined
        break;
      default:
        break;
    }

    // Update device list based on message
    // TODO: This will overwrite zones handled by player with zones player played in
    this.updateDevice(data)
  }

  played() {
    if (this.gongPlaying == true) {
      this.gongPlaying = false
    }
  }

  /**
   * Update device list
   */
  updateDevice(data:object) {
    let message = Object.assign(new Message(), data)

    if (message.name === undefined)
      return

    for (let device of this.devices) {
      if (device.name == message.name) {
        device.update(message.type, message.zones)
      }
    }
  }

  /**
   * Handle remote button press
   */
  remoteAction = () => {
    console.log(`[server] New playing state: ${!this.gongPlaying}`)
    if (this.gongPlaying) {
      client.publish('stop')
      console.debug(`[mqtt] > stop`)
    } else {
      let message = JSON.stringify(new PlayMessage(["all"], repeatGong))
      client.publish('play', message)
      console.debug(`[mqtt] > play: ${message}`)
    }

    this.gongPlaying = !this.gongPlaying
  }
}

// Instantiate server object
const server = new Server((process.env.DEVICES || '').split(','));
