import { Server } from "./server"
import { State } from "./models"
import { parseJson } from "./lib"
import { updateDevice } from "./devices"

const mqtt = require('mqtt')
const mqtt_server = process.env.MQTT_SERVER || 'mqtt'
const client = mqtt.connect(`mqtt://${mqtt_server}`, {
  'username': 'mqtt',
  'password': `${process.env.MQTT_PASSWORD}`,
})
const topics = ["pong", "activated", "playing", "played"]

console.log('[mqtt] Connecting to MQTT server..')

/**
  * Subscribe to topics
  */
client.on('connect', () => {
    console.log('[mqtt] Connected! Listening for topics:', topics.join(', '))
    for (let topic of topics) {
        client.subscribe(topic)
    }

    client.publish(`ping`);
})

/**
 * Handle subscribed messages received
 * @param topic MQTT topic
 * @param message if any, in JSON format
 * @param server instance
 */
function handleMessage(topic: string, message: string, server:Server) {
  //console.debug(`[mqtt] < ${topic}: ${message}`)

  // Parse message to JSON, if any
  let data = parseJson(message)

  switch (topic) {
      case 'activated':
          // TODO: Depending on time action initiated, play in different locations
          console.log(`[remote] Action initiated by ${data.name}`)
          data.state = server.gongPlaying ? State.Deactivated : State.Activated
          server.playGong(["all"], server.gongRepeat)
          break;
      case 'playing':
          console.log(`[player] '${data.name}' started playing`)
          data.locations = undefined
          data.state = State.Playing
          clearTimeout(server.playTimeout)
          break;
      case 'played':
          console.log(`[player] '${data.name}' finished playing`)
          server.played()
          data.state = State.Played
          data.locations = undefined // To not overwrite locations in device list
          break;
      default:
          break;
  }

  // Update device list based on message
  updateDevice(data, server.devices)
}

export { client, handleMessage }