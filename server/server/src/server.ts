const mqtt = require('mqtt')
const client  = mqtt.connect('mqtt://mqtt')
const topics = ["activated", "stop"]

let gongPlaying = false;

client.on('connect', function () {
  console.log('Connected! Listening for topics:\n', topics.join(', '))
  for (let topic of topics) {
    client.subscribe(topic)
  }
})

function handleRemoteAction() {
  console.log(`New playing state: ${!gongPlaying}`)
  if (gongPlaying) {
    gongPlaying = false
    client.publish('stop');
  } else {
    gongPlaying = true
    client.publish('play')
  }
}

client.on('message', function (topic: string, message: object) {
  // message is Buffer
  console.log(`Topic: ${topic} Message: ${message.toString()}`)

  if (topic === 'activated') {
    handleRemoteAction()
  } else if (topic === 'stop') {
    gongPlaying = false
  }
})

console.log(`Gong server starting.\n\nConnecting to MQTT server..?`)