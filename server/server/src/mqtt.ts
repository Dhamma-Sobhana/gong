const mqtt = require('mqtt')
const mqtt_server = process.env.MQTT_SERVER || 'mqtt'
const client = mqtt.connect(`mqtt://${mqtt_server}`)
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

export { client }