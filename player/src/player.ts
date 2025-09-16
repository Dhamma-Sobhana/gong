import { exec } from "child_process";

import * as Sentry from "@sentry/node";

import play from 'play-sound'
import { MqttClient } from 'mqtt'
import BalenaAudio from 'balena-audio'

import { getGongTypeByName, getLocations, parseJson } from './lib'
import { GongType, Message } from './models'

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
    watchdog?: NodeJS.Timeout
    disabled: boolean = false

    /**
     * Instantiate player with locations handled, and connect to MQTT and audio service
     * @param mqtt client
     * @param locations handled by player
     */
    constructor(client: MqttClient, audioBlock: BalenaAudio, name: string, locations: Array<string>, disabled: boolean = false) {
        this.client = client
        this.audioBlock = audioBlock
        this.name = name
        this.audio = undefined
        this.locations = locations
        this.disabled = disabled

        if (this.disabled)
            console.log('[player] Device disabled')

        this.client.on('connect', () => {
            this.mqttConnect()
        })

        this.client.on('message', (topic: string, message: Buffer) => {
            this.mqttMessage(topic, message.toString())
            this.resetWatchdog()
        })

        this.audioBlock.listen()

        console.log('[mqtt] Connecting to MQTT server..')

        this.resetWatchdog()
    }

    destroy() {
        clearInterval(this.watchdog)
    }

    /**
     * Setup connection to audio block to allow volume to be changed during runtime
     */
    setVolume = async (audioVolume:number) => {
        if (!this.audioBlock.connected)
            await this.audioBlock.connectWithRetry()
        await this.audioBlock.setVolume(audioVolume)
    }

    /**
     * Subscribe to topics and send alive message
     */
    mqttConnect = () => {
        let mqtt_topics = topics.concat([`test/${this.name}`])
        console.log('[mqtt] Connected! Listening for topics:', mqtt_topics.join(', '))

        for (let topic of mqtt_topics) {
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
        } else if (topic === `test/${this.name}`) {
            console.log('[player] Test playback started')
            let type = getGongTypeByName(data.type)
            this.playGong(type, ['all'], 1000)
        } else if (topic == 'stop' && this.audio !== undefined) {
            this.audio.kill()
            this.audio = undefined
            console.log('[player] Stopping playback')
        } else if (topic == 'play' && !this.disabled) {
            let type = getGongTypeByName(data.type)
            this.playGong(type, data.locations, data.repeat)
        }
    }

    /**
     * Play gong sound and publish played message if successful
     * @param type of sound to play
     * @param locations to play in
     * @param repeat number of times to play
     */
    playGong = async (type:GongType, locations: Array<string>, repeat: number) => {
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

        console.log(`[player] Playing '${type.name}' in locations '${locations}'`)

        let message = JSON.stringify(new Message(this.name, locations))
        this.client.publish(`playing`, message);

        await this.setVolume(audioVolumeStart)

        this.startPlayback(type, locations, repeat)
    }

    /**
     * Start playback of sound
     * @param type of sound to play
     * @param locations where to play
     * @param repeat number of times to play
     */
    startPlayback = (type:GongType, locations: Array<string>, repeat: number) => {
        this.audio = playSound.play(type.file_name, (err: any) => {
            if (err && err.killed) {
                console.log(`[player] Playback stopped by server`)
            } else if (err) {
                console.error("[player] Error: ", err)
            } else {
                this.playBackFinished(type, locations, --repeat)
            }
        })
    }

    /**
     * Called at end of playback. Increases volume after first time played.
     * Plays again or report playback finished.
     * @param locations where to play
     * @param repeat number of times left to play
     */
    playBackFinished = async (type:GongType, locations: Array<string>, repeat: number) => {
        await this.setVolume(audioVolume)

        // Play again
        if ((this.audio != undefined) && (repeat > 0)) {
            return this.startPlayback(type, locations, repeat)
        }

        let message = JSON.stringify(new Message(this.name, locations))
        this.client.publish(`played`, message);

        console.log(`[player] Play finished`)
    }

    /**
     * Respond to device status request (pong)
     */
    sendPong() {
        if (this.disabled)
            this.client.publish(`pong`, JSON.stringify(new Message(this.name, this.locations, 'player', 'disabled')));
        else
            this.client.publish(`pong`, JSON.stringify(new Message(this.name, this.locations, 'player')));
    }

    /**
     * Watchdog that unless reset, will restart the device if no messages have been
     * received 10 minutes. Will hopefully fix some network issues
     */
    resetWatchdog = () => {
        clearTimeout(this.watchdog)
        this.watchdog = setTimeout( async () => {
            let message = `[player] (${this.name}) No message received in 10 minutes, resetting device`
            console.error(message)
            Sentry.captureMessage(message)
            await Sentry.flush()
            
            exec('DBUS_SYSTEM_BUS_ADDRESS=unix:path=/host/run/dbus/system_bus_socket \
                dbus-send \
                --system \
                --print-reply \
                --dest=org.freedesktop.systemd1 \
                /org/freedesktop/systemd1 \
                org.freedesktop.systemd1.Manager.Reboot', (err, output) => {
                    if (err) {
                        console.error("Failed to reboot device")
                    } else {
                        console.log("Device rebooting")
                    }
                })
        }, 10*60*1000)
    }
}

export { Player }