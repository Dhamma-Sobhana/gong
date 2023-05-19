const mqtt = require('mqtt')
const client  = mqtt.connect('mqtt://mqtt')
const topics = ["activated", "played"]

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
  }

  /**
   * Handle subscribed messages received
   * @param topic MQTT topic
   * @param message if any, in JSON format
   */
  mqttMessage = (topic: string, message: object) => {
    console.log(`Topic: ${topic} Message: ${message.toString()}`)

    if (topic === 'activated') {
      this.handleRemoteAction()
    } else if (topic === 'played') {
      if (this.gongPlaying == true) {
        this.gongPlaying = false
        client.publish('stop')
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
      client.publish('play')
    }
  }
}

// Instantiate server object
const server = new Server();

console.log(`Gong server starting.\n\nConnecting to MQTT server..`)