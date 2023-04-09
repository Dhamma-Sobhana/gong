const mqtt = require('mqtt')
const client  = mqtt.connect('mqtt://mqtt')

client.on('connect', function () {
  console.log('Connected!')
  client.subscribe('presence', function (err: object) {
    if (!err) {
      client.publish('presence', 'Hello mqtt!')
    }
  })
})

client.on('message', function (topic: string, message: object) {
  // message is Buffer
  console.log("Received: ", message.toString())
})

console.log(`Gong server starting.\n\nConnecting to MQTT server..`)