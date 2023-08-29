const mqtt = require('mqtt')
const mqtt_server = process.env.MQTT_SERVER || 'mqtt'
const client = mqtt.connect(`mqtt://${mqtt_server}`)
const topics = ["pong", "activated", "played"]

/**
  * Subscribe to topics
  */
client.on('connect', () => {
    console.log('Connected! Listening for topics:\n', topics.join(', '))
    for (let topic of topics) {
        client.subscribe(topic)
    }

    client.publish(`ping`);
})

export { client }