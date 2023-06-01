const mqtt = require('mqtt')
const client  = mqtt.connect('mqtt://mqtt')
const topics = ["pong", "activated", "played"]

class Pong {
  name: string = 'undefined';
  type: string = 'undefined';
  zones?: Array<string>;
}

class DeviceStatus {
  name: string;
  type?: string;
  zones?: Array<string>;
  timestamp?: number

  constructor(name: string) {
      this.name = name
  }

  update = (type: string, zones?: Array<string>) => {
      this.type = type
      this.zones = zones
      this.timestamp = Date.now()
  }

  toString() {
      if (this.type !== undefined)
      return `${this.name} (${this.type}) Last seen: ${this.timestamp}`
      else
      return `${this.name}`
  }
}

class Server {
  gongPlaying: boolean = false
  devices: Array<DeviceStatus> = []

  constructor(devices: Array<string>) {
    for (let device of devices) {
      this.devices.push(new DeviceStatus(device))
    }

    client.on('connect', () => {
      this.mqttConnect()
    })

    client.on('message', (topic: string, message: object) => {
      this.mqttMessage(topic, message)
    })

    console.log(`Gong server starting. Devices: ${this.devices}\n\nConnecting to MQTT server..`)
  }

  /**
   * Subscribe to topics
   */
  mqttConnect() {
    console.log('Connected! Listening for topics:\n', topics.join(', '))
    for (let topic of topics) {
      client.subscribe(topic)
    }

    client.publish(`ping`);
  }

  /**
   * Handle subscribed messages received
   * @param topic MQTT topic
   * @param message if any, in JSON format
   */
  mqttMessage = (topic: string, message: object) => {
    console.log(`Topic: ${topic} Message: ${message.toString()}`)

    // Parse message to JSON, if any
    let data = undefined
    try {
      data = JSON.parse(message.toString())
    } catch {}

    if (topic === 'activated') {
      this.handleRemoteAction()
    } else if (topic === 'played') {
      if (this.gongPlaying == true) {
        this.gongPlaying = false
        client.publish('stop')
      }
    } else if (topic === 'pong') {
      let pong = Object.assign(new Pong(), data)
      this.handlePong(pong)
      this.printDevicesStatus()
    }
  }

  /**
   * Print devices status to console
   */
  printDevicesStatus = () => {
    console.log(`Type\t| Name\t\t| Last seen`)
    console.log(`-----------------------------------------`)
    for(let device of this.devices) {
      console.log(`${device.type}\t| ${device.name}\t| ${device.timestamp}`)
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
    console.log(`New playing state: ${!this.gongPlaying}`)
    if (this.gongPlaying) {
      this.gongPlaying = false
      client.publish('stop')
    } else {
      this.gongPlaying = true
      client.publish('play', JSON.stringify({"zones": ["all"]}))
    }
  }
}

// Instantiate server object
const server = new Server((process.env.DEVICES || '').split(','));
