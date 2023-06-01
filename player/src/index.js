const { randomUUID } = require('crypto')
const mqtt = require('mqtt')
var playSound = require('play-sound')(opts = {})
const { getMac, getZones } = require('./lib')

const name = process.env.NAME || getMac() || randomUUID()
const server = process.env.MQTT_SERVER || 'localhost'

let client  = mqtt.connect(`mqtt://${server}`);
const topics = ['ping', 'play', 'stop']

class Player {
  audio;
  zones;

  constructor(zones) {
    this.audio = undefined
    this.zones = zones

    client.on('connect', () => {
      this.mqttConnect()
    })

    client.on('message', (topic, message) => {
      this.mqttMessage(topic, message)
    })

    console.log(`Gong client starting.\n\nName: ${name}\nZones: ${this.zones}\nServer: ${server}\n\nConnecting to MQTT server..`)
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

    // Parse message to JSON, if any
    let data = undefined
    try {
      data = JSON.parse(message)
    } catch {}

    if (topic === 'ping') {
      this.sendPong()
    } else if (topic == 'play') {
      let zones = getZones(this.zones, data.zones)

      if (zones.length === 0) {
        console.log('Zones not handled by this device')
        return
      }

      this.playGong(zones, data.repeat)
    } else if (topic == 'stop') {
      if (this.audio !== undefined) {
        this.audio.kill()
        this.audio = undefined
        console.log('Stopping playback')
      }
    }
  }

  /**
   * Play gong sound and publish played message if successful
   * @param {Array} zones to play in
   */
  playGong = (zones, repeat) => {
    // TODO: Turn GPIO on or off
    if (this.audio !== undefined) {
      this.audio.kill()
    }

    console.log(`Playing in zones '${zones}'`)

    let payload = {
      "name": name,
      "zones": zones
    }
    
    client.publish(`playing`, JSON.stringify(payload));

    this.startPlayback(zones, repeat)
  }

  /**
   * Play sound number of times
   * @param {Array<string>} zones 
   * @param {number} repeat 
   */
  startPlayback = (zones, repeat) => {
    this.audio = playSound.play('./sound/gong-8s.mp3', (err) => {
      if (err && err.killed) {
        console.log(`Playback stopped by server`)
      } else if (err) {
        console.error("Error: ", err)
      } else {
        this.playBackFinished(zones, repeat)
      }
    })
  }

  /**
   * Play again or report playback finished
   * @param {Array<string>} zones 
   * @param {number} repeat 
   */
  playBackFinished = (zones, repeat) => {
    repeat--
    if ((this.audio != undefined) && (repeat > 0)) {
      this.startPlayback(zones, repeat)
      return
    }

    let payload = {
      "name": name,
      "zones": zones
    }
    console.log(`Play finished`)
    client.publish(`played`, JSON.stringify(payload));
  }

  /**
   * Respond to device status request (pong)
   */
  sendPong() {
    let payload = {
      "name": name,
      "zones": this.zones,
      "type": "player"
    }
    client.publish(`pong`, JSON.stringify(payload));
  }
}

// Instantiate player object with zones handled 
const player = new Player((process.env.ZONES || 'all').split(','));