import BalenaAudio from 'balena-audio'
import { randomUUID } from 'crypto'
import * as mqtt from 'mqtt'
import play from 'play-sound'

import { getZones, parseJson } from '../../server/server/src/lib'
import { Message } from '../../server/server/src/models'

const playSound = play({})

const name = process.env.NAME || randomUUID()
const server = process.env.MQTT_SERVER || 'localhost'

const pulseServer = process.env.PULSE_SERVER || 'unix:/run/pulse/pulseaudio.socket'
const audioVolume = process.env.AUDIO_VOLUME ? parseInt(process.env.AUDIO_VOLUME) : 100
const audioVolumeStart = process.env.AUDIO_VOLUME_START ? parseInt(process.env.AUDIO_VOLUME_START) : 50
const audioBlock = new BalenaAudio(pulseServer)

let client  = mqtt.connect(`mqtt://${server}`);
const topics = ['ping', 'play', 'stop']

/**
 * Class that connects to audio block and MQTT server and plays sound on request
 */
class Player {
  audio : any;
  zones : Array<string>;

  /**
   * Instantiate player with zones handled, and connect to MQTT and audio service
   * @param zones handled by player
   */
  constructor(zones : Array<string>) {
    this.audio = undefined
    this.zones = zones

    client.on('connect', () => {
      this.mqttConnect()
    })

    client.on('message', (topic : string, message: object) => {
      this.mqttMessage(topic, message.toString())
    })

    this.setupAudio()

    console.log(`[player] Gong player starting.\n\nName: ${name}\nZones: ${this.zones}\nServer: ${server}`)
    console.log('[mqtt] Connecting to MQTT server..')
  }

  /**
   * Setup connection to audio block to allow volume to be changed during runtime
   */
  setupAudio = async () => {
    await audioBlock.listen()
    await audioBlock.setVolume(audioVolumeStart)
  }

  /**
   * Subscribe to topics and send alive message
   */
  mqttConnect = () => {
    console.log('[mqtt] Connected! Listening for topics:', topics.join(', '))

    for (let topic of topics) {
      client.subscribe(topic)
    }

    // Send message telling that the device is alive
    this.sendPong()
  } 

  /**
   * Handle subscribed messages received
   * @param topic MQTT topic
   * @param message MQTT message, if any
   */
  mqttMessage = (topic : string, message : string) => {
    console.debug(`[mqtt] < ${topic}: ${message}`)

    // Parse message to JSON, if any
    let data = parseJson(message)

    if (topic === 'ping') {
      this.sendPong()
    } else if (topic == 'play') {
      this.playGong(data.zones, data.repeat)
    } else if (topic == 'stop') {
      if (this.audio !== undefined) {
        this.audio.kill()
        this.audio = undefined
        console.log('[player] Stopping playback')
      }
    }
  }

  /**
   * Play gong sound and publish played message if successful
   * @param zones to play in
   * @param repeat number of times to play
   */
  playGong = (zones : Array<string>, repeat : number) => {
    zones = getZones(this.zones, zones)

    if (zones.length === 0) {
      console.log('[player] Zones not handled by this device')
      return
    }

    // TODO: Turn GPIO on or off
    // Stop audio if already plaing
    if (this.audio !== undefined) {
      this.audio.kill()
    }

    console.log(`[player] Playing in zones '${zones}'`)

    let message = JSON.stringify(new Message(name, zones))
    client.publish(`playing`, message);

    audioBlock.setVolume(audioVolumeStart)

    this.startPlayback(zones, repeat)
  }

  /**
   * Start playback of sound
   * @param zones where to play
   * @param repeat number of times to play
   */
  startPlayback = (zones : Array<string>, repeat : number) => {
    this.audio = playSound.play('./sound/gong-8s.mp3', (err : any) => {
      if (err && err.killed) {
        console.log(`[player] Playback stopped by server`)
      } else if (err) {
        console.error("[player] Error: ", err)
      } else {
        this.playBackFinished(zones, --repeat)
      }
    })
  }

  /**
   * Called at end of playback. Increases volume after first time played.
   * Plays again or report playback finished.
   * @param zones where to play
   * @param repeat number of times left to play
   */
  playBackFinished = (zones : Array<string>, repeat : number) => {
    audioBlock.setVolume(audioVolume)

    // Play again
    if ((this.audio != undefined) && (repeat > 0)) {
      return this.startPlayback(zones, repeat)
    }

    let message = JSON.stringify(new Message(name, zones))
    client.publish(`played`, message);

    console.log(`[player] Play finished`)
  }

  /**
   * Respond to device status request (pong)
   */
  sendPong() {
    let message = JSON.stringify(new Message(name, this.zones, 'player'))
    client.publish(`pong`, message);
  }
}

// Instantiate player object with zones handled 
const player = new Player((process.env.ZONES || 'all').split(','));

export { Player, client }