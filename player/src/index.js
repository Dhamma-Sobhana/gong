const { randomUUID } = require('crypto')
const mqtt = require('mqtt')
var playSound = require('play-sound')(opts = {})
const { getMac, getZones } = require('./lib')

let name = process.env.NAME || getMac() || randomUUID()
let playerZones = (process.env.ZONES || 'student-accommodation,outside').split(',')
let server = process.env.MQTT_SERVER || 'localhost'

let client  = mqtt.connect(`mqtt://${server}`);
const topics = ['ping', 'play', 'stop']

class Player {
  audio;

  constructor() {
    this.audio = undefined

    client.on('connect', () => {
      this.mqttConnect()
    })

    client.on('message', (topic, message) => {
      this.mqttMessage(topic, message)
    })
  }

  /**
   * Subscribe to topics and send alive message
   */
  mqttConnect = () => {
    console.log('Connected! Listening for topics:\n', topics.join(', '))
    for (let topic of topics) {
      client.subscribe(topic)
    }

    // Send message telling that the device is alive
    this.sendPong()
  }

  /**
   * Handle subscribed messages received
   */
  mqttMessage = (topic, message) => {
    console.log(`Message. Topic: '${topic}' Message: '${message}'`)

    let data = undefined
    try {
      data = JSON.parse(message)
    } catch {}

    if (topic === 'ping') {
      this.sendPong()
    } else if (topic == 'play') {
      let zones = getZones(playerZones, data.zones)

      if (zones.length === 0) {
        console.log('Zones not handled by this device')
        return
      }

      this.playGong(zones)
    } else if (topic == 'stop') {
      if (this.audio !== undefined) {
        this.audio.kill()
        console.log('Stopping playback')
      }
    }
  }

  /**
   * Play gong sound and publish played message if successful
   * @param {Array} affectedAreas areas to play in
   */
  playGong(zones) {
    // TODO: Turn GPIO on or off

    console.log(`Playing in zones '${zones}'`)

    let payload = {
      "name": name,
      "zones": zones
    }
    
    client.publish(`playing`, JSON.stringify(payload));

    this.audio = playSound.play('./sound/gong-short.mp3', function(err) {
      if (err && err.killed) {
        console.log(`Playback stopped by server`)
      } else if (err) {
        console.error("Error: ", err)
      } else {
        payload = {
          "name": name,
          "zones": zones
        }
        console.log(`Play finished`)
        client.publish(`played`, JSON.stringify(payload));
        client.publish(`stop`);
      }
    })
  }

  sendPong() {
    let payload = {
      "name": name,
      "zones": playerZones
    }
    client.publish(`pong`, JSON.stringify(payload));
  }
}

const player = new Player();

console.log(`Gong client starting.\n\nName: ${name}\nZones: ${playerZones}\nServer: ${server}\n\nConnecting to MQTT server..`)