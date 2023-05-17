const { randomUUID } = require('crypto')
const mqtt = require('mqtt')
var playSound = require('play-sound')(opts = {})
const { getMac, formatDateTime, getAffectedAreas } = require('./lib.js')

let name = process.env.NAME || getMac() || randomUUID()
let areas = (process.env.AREAS || '0').split(',')
areas = areas.map(str => Number(str))
let server = process.env.MQTT_SERVER || 'localhost'
process.env.TZ = process.env.TZ || 'Europe/Stockholm'

let client  = mqtt.connect(`mqtt://${server}`);
let topics = ['ping', 'play', 'stop']

class Player {
  audio;

  constructor() {
    this.audio = undefined

    this.setupMqtt()
  }

  setupMqtt = () => {
    /**
     * Subscribe to topics on MQTT connection
     */
    client.on('connect', () => {
      console.log('Connected! Listening for topics:\n', topics.join(', '))
      for (let topic of topics) {
        client.subscribe(topic)
      }
      // Send message telling that the device is alive
      this.sendPong()
    })

    /**
     * Handle subscribed messages received
     */
    client.on('message', (topic, message) => {
      let data = undefined
      try {
        data = JSON.parse(message)
      } catch {}
      
      console.log(topic, data)

      if (topic === 'ping') {
        // Respond that I am alive
        this.sendPong()
      } else if (topic == 'play') {
        // const affectedAreas = getAffectedAreas(data.areas)

        // if (affectedAreas.length === 0) {
        //   console.log('Area not handled by this device')
        //   return
        // }

        this.playGong([0])
      } else if (topic == 'stop') {
        
        if (this.audio !== undefined) {
          this.audio.kill()
          console.log('Stopping playback')
        }
      }
    })
  }

  /**
   * Play gong sound and publish played message if successful
   * @param {Array} affectedAreas areas to play in
   */
  playGong(affectedAreas) {
    // TODO: Turn GPIO on or off

    console.log(`Playing in areas '${affectedAreas}'`)

    let now = new Date().getTime()

    let payload = {
      "name": name,
      "areas": affectedAreas,
      "timestamp-millis": now,
      "timestamp": formatDateTime(now),
    }
    
    client.publish(`playing`, JSON.stringify(payload));

    this.audio = playSound.play('./sound/gong-short.mp3', function(err) {
      if (err && err.killed) {
        console.log(`Playback stopped by server`)
      } else if (err) {
        console.error("Error: ", err)
      } else {
        let now = new Date().getTime()
        payload = {
          "name": name,
          "areas": affectedAreas,
          "timestamp-millis": now,
          "timestamp": formatDateTime(now),
        }
        console.log(`Play finished at ${formatDateTime(now)}`)
        client.publish(`played`, JSON.stringify(payload));
        client.publish(`stop`);
      }
    })
  }

  sendPong() {
    let now = new Date().getTime()
    let payload = {
      "name": name,
      "areas": areas,
      "timestamp-millis": now,
      "timestamp": formatDateTime(now)
    }
    client.publish(`pong`, JSON.stringify(payload));
  }
}

const player = new Player();

console.log(`Gong client starting.\n\nName: ${name}\nAreas: ${areas}\nServer: ${server}\n\nConnecting to MQTT server..`)