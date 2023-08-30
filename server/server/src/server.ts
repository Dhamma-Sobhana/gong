import { Request, Response } from 'express';

import { Message, DeviceStatus, PlayMessage } from './models'
import { logArray, printDevicesStatus } from './log'
import { app } from './web'
import { client } from './mqtt'

process.env.TZ = 'Europe/Stockholm'

const repeatGong = process.env.GONG_REPEAT !== undefined ? parseInt(process.env.GONG_REPEAT) : 1

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
      this.handleRemoteAction()
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
    let data = undefined
    try {
      data = JSON.parse(message.toString())
    } catch {}

    switch (topic) {
      case 'activated':
        this.handleRemoteAction()
        break;
      case 'played':
        if (this.gongPlaying == true) {
          this.gongPlaying = false
          client.publish('stop')
        }
        break;
      case 'pong':
        let pong = Object.assign(new Pong(), data)
        this.handlePong(pong)
        printDevicesStatus(this.devices)
        break;
      default:
        break;
    }
  }

  /**
   * Device status received
   */
  handlePong = (pong: Pong) => {
    if (pong.type == 'player')
      console.log(`Player device active. Name: ${pong.name} Zones: ${pong.zones}`)
    else
      console.log(`Remote device active. Name: ${pong.name}`)
    
    for (let device of this.devices) {
      if (device.name == pong.name) {
        device.update(pong.type, pong.zones)
      }
    }
  }

  /**
   * Handle remote button press
   */
  handleRemoteAction = () => {
    console.log(`[server] New playing state: ${!this.gongPlaying}`)
    if (this.gongPlaying) {
      this.gongPlaying = false
      client.publish('stop')
      console.debug(`[mqtt] > stop`)
    } else {
      let message = JSON.stringify(new PlayMessage(["all"], repeatGong))
      client.publish('play', message)
      console.debug(`[mqtt] > play: ${message}`)
    }
  }
}

// Instantiate server object
const server = new Server((process.env.DEVICES || '').split(','));
