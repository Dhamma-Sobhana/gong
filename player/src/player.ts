import play from 'play-sound'
import { MqttClient } from 'mqtt'
import BalenaAudio from 'balena-audio'

import { getLocations, parseJson } from './lib'
import { Message } from './models'

const playSound = play({})

const audioVolume = process.env.AUDIO_VOLUME ? parseInt(process.env.AUDIO_VOLUME) : 100
const audioVolumeStart = process.env.AUDIO_VOLUME_START ? parseInt(process.env.AUDIO_VOLUME_START) : 50

const topics = ['ping', 'play', 'stop']

/**
 * Class that connects to audio block and MQTT server and plays sound on request
 */
class Player {
    client: MqttClient
    audioBlock: BalenaAudio
    name: string
    audio: any;
    locations: Array<string>;

    /**
     * Instantiate player with locations handled, and connect to MQTT and audio service
     * @param mqtt client
     * @param locations handled by player
     */
    constructor(client: MqttClient, audioBlock: BalenaAudio, name: string, locations: Array<string>) {
        this.client = client
        this.audioBlock = audioBlock
        this.name = name
        this.audio = undefined
        this.locations = locations

        this.client.on('connect', () => {
            this.mqttConnect()
        })

        this.client.on('message', (topic: string, message: Buffer) => {
            this.mqttMessage(topic, message.toString())
        })

        this.setupAudio()

        console.log('[mqtt] Connecting to MQTT server..')
    }

    /**
     * Setup connection to audio block to allow volume to be changed during runtime
     */
    setupAudio = async () => {
        await this.audioBlock.listen()
        await this.audioBlock.setVolume(audioVolumeStart)
    }

    /**
     * Subscribe to topics and send alive message
     */
    mqttConnect = () => {
        console.log('[mqtt] Connected! Listening for topics:', topics.join(', '))

        for (let topic of topics) {
            this.client.subscribe(topic)
        }

        // Send message telling that the device is alive
        this.sendPong()
    }

    /**
     * Handle subscribed messages received
     * @param topic MQTT topic
     * @param message MQTT message, if any
     */
    mqttMessage = (topic: string, message: string) => {
        //console.debug(`[mqtt] < ${topic}: ${message}`)

        // Parse message to JSON, if any
        let data = parseJson(message)

        if (topic === 'ping') {
            this.sendPong()
        } else if (topic == 'play') {
            this.playGong(data.locations, data.repeat)
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
     * @param locations to play in
     * @param repeat number of times to play
     */
    playGong = (locations: Array<string>, repeat: number) => {
        locations = getLocations(this.locations, locations)

        if (locations.length === 0) {
            console.log('[player] Locations not handled by this device')
            return
        }

        // TODO: Turn GPIO on or off
        // Stop audio if already plaing
        if (this.audio !== undefined) {
            this.audio.kill()
        }

        console.log(`[player] Playing in locations '${locations}'`)

        let message = JSON.stringify(new Message(this.name, locations))
        this.client.publish(`playing`, message);

        this.audioBlock.setVolume(audioVolumeStart)

        this.startPlayback(locations, repeat)
    }

    /**
     * Start playback of sound
     * @param locations where to play
     * @param repeat number of times to play
     */
    startPlayback = (locations: Array<string>, repeat: number) => {
        this.audio = playSound.play('./sound/gong-8s.mp3', (err: any) => {
            if (err && err.killed) {
                console.log(`[player] Playback stopped by server`)
            } else if (err) {
                console.error("[player] Error: ", err)
            } else {
                this.playBackFinished(locations, --repeat)
            }
        })
    }

    /**
     * Called at end of playback. Increases volume after first time played.
     * Plays again or report playback finished.
     * @param locations where to play
     * @param repeat number of times left to play
     */
    playBackFinished = (locations: Array<string>, repeat: number) => {
        this.audioBlock.setVolume(audioVolume)

        // Play again
        if ((this.audio != undefined) && (repeat > 0)) {
            return this.startPlayback(locations, repeat)
        }

        let message = JSON.stringify(new Message(this.name, locations))
        this.client.publish(`played`, message);

        console.log(`[player] Play finished`)
    }

    /**
     * Respond to device status request (pong)
     */
    sendPong() {
        let message = JSON.stringify(new Message(this.name, this.locations, 'player'))
        this.client.publish(`pong`, message);
    }
}

export { Player }