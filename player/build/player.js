"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const balena_audio_1 = __importDefault(require("balena-audio"));
const crypto_1 = require("crypto");
const mqtt = __importStar(require("mqtt"));
const play_sound_1 = __importDefault(require("play-sound"));
const playSound = (0, play_sound_1.default)({});
const name = process.env.NAME || (0, crypto_1.randomUUID)();
const server = process.env.MQTT_SERVER || 'localhost';
const pulseServer = process.env.PULSE_SERVER || 'unix:/run/pulse/pulseaudio.socket';
const audioVolume = process.env.AUDIO_VOLUME ? parseInt(process.env.AUDIO_VOLUME) : 100;
const audioVolumeStart = process.env.AUDIO_VOLUME_START ? parseInt(process.env.AUDIO_VOLUME_START) : 50;
const audioBlock = new balena_audio_1.default(pulseServer);
let client = mqtt.connect(`mqtt://${server}`);
const topics = ['ping', 'play', 'stop'];
/**
* Get the zones that was received that the player also handles
* @param {Array} playerZones Zones the player handles
* @param {Array} messageZones Zones in the message
* @returns {Array} Zones in both arrays or ['all'] if it was received
*/
function getZones(playerZones, messageZones) {
    if (playerZones.includes('all') || messageZones.includes('all'))
        return ['all'];
    return playerZones.filter((x) => messageZones.includes(x));
}
/**
 * Class that connects to audio block and MQTT server and plays sound on request
 */
class Player {
    audio;
    zones;
    /**
     * Instantiate player with zones handled, and connect to MQTT and audio service
     * @param zones handled by player
     */
    constructor(zones) {
        this.audio = undefined;
        this.zones = zones;
        client.on('connect', () => {
            this.mqttConnect();
        });
        client.on('message', (topic, message) => {
            this.mqttMessage(topic, message);
        });
        this.setupAudio();
        console.log(`Gong client starting.\n\nName: ${name}\nZones: ${this.zones}\nServer: ${server}\n\nConnecting to MQTT server..`);
    }
    /**
     * Setup connection to audio block to allow volume to be changed during runtime
     */
    setupAudio = async () => {
        await audioBlock.listen();
        await audioBlock.setVolume(audioVolumeStart);
    };
    /**
     * Subscribe to topics and send alive message
     */
    mqttConnect = () => {
        console.log('Connected! Listening for topics:\n', topics.join(', '));
        for (let topic of topics) {
            client.subscribe(topic);
        }
        // Send message telling that the device is alive
        this.sendPong();
    };
    /**
     * Handle subscribed messages received
     * @param topic MQTT topic
     * @param message MQTT message, if any
     */
    // TODO: Is message object or string?
    mqttMessage = (topic, message) => {
        console.log(`Message. Topic: '${topic}' Message: '${message.toString()}'`);
        // Parse message to JSON, if any
        let data = undefined;
        try {
            data = JSON.parse(message.toString());
        }
        catch { }
        if (topic === 'ping') {
            this.sendPong();
        }
        else if (topic == 'play') {
            let zones = getZones(this.zones, data.zones);
            if (zones.length === 0) {
                console.log('Zones not handled by this device');
                return;
            }
            this.playGong(zones, data.repeat);
        }
        else if (topic == 'stop') {
            if (this.audio !== undefined) {
                this.audio.kill();
                this.audio = undefined;
                console.log('Stopping playback');
            }
        }
    };
    /**
     * Play gong sound and publish played message if successful
     * @param zones to play in
     * @param repeat number of times to play
     */
    playGong = (zones, repeat) => {
        // TODO: Turn GPIO on or off
        // Stop audio if already plaing
        if (this.audio !== undefined) {
            this.audio.kill();
        }
        console.log(`Playing in zones '${zones}'`);
        let payload = {
            "name": name,
            "zones": zones
        };
        client.publish(`playing`, JSON.stringify(payload));
        audioBlock.setVolume(audioVolumeStart);
        this.startPlayback(zones, repeat);
    };
    /**
     * Start playback of sound
     * @param zones where to play
     * @param repeat number of times to play
     */
    startPlayback = (zones, repeat) => {
        this.audio = playSound.play('./sound/gong-8s.mp3', (err) => {
            if (err && err.killed) {
                console.log(`Playback stopped by server`);
            }
            else if (err) {
                console.error("Error: ", err);
            }
            else {
                this.playBackFinished(zones, --repeat);
            }
        });
    };
    /**
     * Called at end of playback. Increases volume after first time played.
     * Plays again or report playback finished.
     * @param zones where to play
     * @param repeat number of times left to play
     */
    playBackFinished = (zones, repeat) => {
        audioBlock.setVolume(audioVolume);
        // Play again
        if ((this.audio != undefined) && (repeat > 0)) {
            return this.startPlayback(zones, repeat);
        }
        let payload = {
            "name": name,
            "zones": zones
        };
        console.log(`Play finished`);
        client.publish(`played`, JSON.stringify(payload));
    };
    /**
     * Respond to device status request (pong)
     */
    sendPong() {
        let payload = {
            "name": name,
            "zones": this.zones,
            "type": "player"
        };
        client.publish(`pong`, JSON.stringify(payload));
    }
}
// Instantiate player object with zones handled 
const player = new Player((process.env.ZONES || 'all').split(','));
