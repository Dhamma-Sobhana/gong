const mqtt = require('mqtt')
const client  = mqtt.connect('mqtt://mqtt')
const topics = ["pong", "activated", "played"]

class Server {
  gongPlaying: boolean = false

  constructor() {
    client.on('connect', () => {
      this.mqttConnect()
    })

    client.on('message', (topic: string, message: object) => {
      this.mqttMessage(topic, message)
    })
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
const server = new Server();

console.log(`Gong server starting.\n\nConnecting to MQTT server..`)

// Pong class
class Pong {
  name?: string;
  type?: string;
  zones?: Array<string>;
}