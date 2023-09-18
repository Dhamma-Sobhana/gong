var DateTime = luxon.DateTime
var Interval = luxon.Interval

const clientId = 'mqttjs_' + Math.random().toString(16).substring(2, 10)
const host = `ws://${location.hostname}:9001`
const options = {
    keepalive: 60,
    clientId: clientId,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
}
const topics = ['activated', 'pong', 'played', 'stop', 'automation']

console.log('Connecting to MQTT server..')
const client = mqtt.connect(host, options)

client.on('error', (err) => {
    console.log('Connection error: ', err)
    client.end()
})

client.on('reconnect', () => {
    console.log('Reconnecting...')
})

client.on('connect', () => {
    console.log('Connected! Listening for topics:\n', topics.join(', '))
    for (let topic of topics) {
        client.subscribe(topic)
    }
})

client.on('message', (topic, message) => {
    console.log(`Topic: ${topic} Message: ${message.toString()}`)
    client.end()

    location.reload()
})

function formatTimeTillNextGong(nextGong) {
    let now = DateTime.now()
    let future = DateTime.fromISO(nextGong)
    return future.diff(now, ['hours', 'minutes', 'seconds']).toFormat("hh:mm:ss")
}