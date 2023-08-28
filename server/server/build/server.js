"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mqtt = require('mqtt');
const mqtt_server = process.env.MQTT_SERVER || 'mqtt';
const client = mqtt.connect(`mqtt://${mqtt_server}`);
const topics = ["pong", "activated", "played"];
process.env.TZ = 'Europe/Stockholm';
// Express.js and Nunjucks for web interface
const express_1 = __importDefault(require("express"));
const nunjucks = require('nunjucks');
const dateFilter = require('nunjucks-date');
const app = (0, express_1.default)();
const http_port = process.env.HTTP_PORT || 8080;
let njEnv = nunjucks.configure('views', {
    autoescape: true,
    express: app
});
dateFilter.install(njEnv);
dateFilter.setDefaultFormat('YYYY-MM-DD HH:mm:ss.SS');
app.set('view engine', 'html');
app.use(express_1.default.static('public'));
let logArray = [];
/**
 * Log messages to in memory cache and console.
 * Limit number of messages to 10
 * @param message String to log
 */
function log(message) {
    if (logArray.length >= 10)
        logArray.shift();
    let now = new Date().toLocaleString('sv-SE');
    logArray.push(`${now}: ${message}`);
    console.log(message);
}
class Pong {
    name = 'undefined';
    type = 'undefined';
    zones;
}
class DeviceStatus {
    name;
    type;
    zones;
    timestamp;
    constructor(name) {
        this.name = name;
    }
    update = (type, zones) => {
        this.type = type;
        this.zones = zones;
        this.timestamp = Date.now();
    };
    toString() {
        if (this.type !== undefined)
            return `${this.name} (${this.type}) Last seen: ${this.timestamp}`;
        else
            return `${this.name}`;
    }
}
class Server {
    gongPlaying = false;
    devices = [];
    constructor(devices) {
        for (let device of devices) {
            this.devices.push(new DeviceStatus(device));
        }
        client.on('connect', () => {
            this.mqttConnect();
        });
        client.on('message', (topic, message) => {
            this.mqttMessage(topic, message);
        });
        app.get('/', (req, res) => {
            res.render('index.njk', { devices: this.devices, playing: this.gongPlaying, log: logArray });
        });
        app.post('/activated', (req, res) => {
            log('[web] Play/Stop');
            this.handleRemoteAction();
            res.redirect('/');
        });
        app.post('/ping', (req, res) => {
            log('[web] Refresh');
            client.publish(`ping`);
            res.redirect('/');
        });
        app.listen(http_port, () => {
            log(`[web]: Listening on port ${http_port}...`);
        });
        log(`Gong server starting. Devices: ${this.devices}\n\nConnecting to MQTT server..`);
    }
    /**
     * Subscribe to topics
     */
    mqttConnect() {
        console.log('Connected! Listening for topics:\n', topics.join(', '));
        for (let topic of topics) {
            client.subscribe(topic);
        }
        client.publish(`ping`);
    }
    /**
     * Handle subscribed messages received
     * @param topic MQTT topic
     * @param message if any, in JSON format
     */
    mqttMessage = (topic, message) => {
        log(`Topic: ${topic} Message: ${message.toString()}`);
        // Parse message to JSON, if any
        let data = undefined;
        try {
            data = JSON.parse(message.toString());
        }
        catch { }
        if (topic === 'activated') {
            this.handleRemoteAction();
        }
        else if (topic === 'played') {
            if (this.gongPlaying == true) {
                this.gongPlaying = false;
                client.publish('stop');
            }
        }
        else if (topic === 'pong') {
            let pong = Object.assign(new Pong(), data);
            this.handlePong(pong);
            this.printDevicesStatus();
        }
    };
    /**
     * Print devices status to console
     */
    printDevicesStatus = () => {
        console.log(`Type\t| Name\t\t| Last seen`);
        console.log(`-----------------------------------------`);
        for (let device of this.devices) {
            console.log(`${device.type}\t| ${device.name}\t| ${device.timestamp}`);
        }
    };
    /**
     * Device status received
     */
    handlePong = (pong) => {
        if (pong.type == 'player')
            log(`Player device active. Name: ${pong.name} Zones: ${pong.zones}`);
        else
            log(`Remote device active. Name: ${pong.name}`);
        for (let device of this.devices) {
            if (device.name == pong.name) {
                device.update(pong.type, pong.zones);
            }
        }
    };
    /**
     * Handle remote button press
     */
    handleRemoteAction = () => {
        log(`New playing state: ${!this.gongPlaying}`);
        if (this.gongPlaying) {
            this.gongPlaying = false;
            client.publish('stop');
        }
        else {
            this.gongPlaying = true;
            client.publish('play', JSON.stringify({ "zones": ["all"], "repeat": 4 }));
        }
    };
}
// Instantiate server object
const server = new Server((process.env.DEVICES || '').split(','));
