const { randomUUID } = require('crypto');
const { networkInterfaces } = require('os')

let mqtt = require('mqtt');
var player = require('play-sound')(opts = {})
var audio

let name = process.env.NAME || getMac() || randomUUID()
let areas = (process.env.AREAS || '0').split(',')
areas = areas.map(str => Number(str))
let server = process.env.MQTT_SERVER || 'localhost'
process.env.TZ = process.env.TZ || 'Europe/Stockholm'

let client  = mqtt.connect(`mqtt://${server}`);
let topics = ['ping', 'play', 'stop']

/**
 * Check for interfaces that looks like physical ones and return the first found mac address.
 * @returns: mac address string or false
 */
function getMac() {
  const validInterfaces = ['eth0', 'en0', 'wlan0']
  let interfaces = networkInterfaces()

  for (const interface of validInterfaces) {
    if (interface in interfaces) {
      return interfaces[interface][0].mac
    }
  }
}

/**
 * Format time with timezone and ISO format
 * @param {Date} dateTime
 * @returns Formatted string in ISO format using time zone
 */
function formatDateTime(dateTime) {
  return new Date(dateTime).toLocaleString('sv', { timeZoneName: 'short' })
}

/**
 * Subscribe to topics on MQTT connection
 */
client.on('connect', function () {
  console.log('Connected! Listening for topics:\n', topics.join(', '))
  for (let topic of topics) {
    client.subscribe(topic)
  }
  // Send message telling that the device is alive
  sendPong()
})

/**
 * Play gong sound and publish played message if successful
 * @param {Array} affectedAreas areas to play in
 */
function playGong(affectedAreas) {
  // TODO: Turn GPIO on or off

  console.log(`Playing in areas '${affectedAreas}'`)

  let now = new Date().getTime()

  let payload = {
    "name": name,
    "areas": affectedAreas,
    "timestamp-millis": now,
    "timestamp": formatDateTime(now),
  }
  
  client.publish(`playing`, JSON.stringify(payload));

  audio = player.play('./sound/gong-short.mp3', function(err) {
    if (err && err.killed) {
      console.log(`Playback stopped by server`)
    } else if (err) {
      console.error("Error: ", err)
    } else {
      let now = new Date().getTime()
      payload = {
        "name": name,
        "areas": affectedAreas,
        "timestamp-millis": now,
        "timestamp": formatDateTime(now),
      }
      console.log(`Play finished at ${formatDateTime(now)}`)
      client.publish(`played`, JSON.stringify(payload));
      client.publish(`stop`);
    }
  })
}

/**
 * Return new array containing all areas both handled and requested or [0] if included in request
 * @param {Array} requestedAreas 
 * @returns Array of intersection of areas or [0]
 */
function getAffectedAreas(requestedAreas) {
  if (requestedAreas.includes(0))
    return [0]
  
  return areas.filter(x => requestedAreas.includes(x))
}

function sendPong() {
  let now = new Date().getTime()
  let payload = {
    "name": name,
    "areas": areas,
    "timestamp-millis": now,
    "timestamp": formatDateTime(now)
  }
  client.publish(`pong`, JSON.stringify(payload));
}

/**
 * Handle subscribed messages received
 */
client.on('message', function (topic, message) {
  let data = undefined
  try {
    data = JSON.parse(message)
  } catch {}
  
  console.log(topic, data)

  if (topic === 'ping') {
    // Respond that I am alive
    sendPong()
  } else if (topic == 'play') {
    // const affectedAreas = getAffectedAreas(data.areas)

    // if (affectedAreas.length === 0) {
    //   console.log('Area not handled by this device')
    //   return
    // }

    playGong([0])
  } else if (topic == 'stop') {
    
    if (audio !== undefined) {
      audio.kill()
      console.log('Stopping playback')
    }
  }
})

console.log(`Gong client starting.\n\nName: ${name}\nAreas: ${areas}\nServer: ${server}\n\nConnecting to MQTT server..`)
console.log(`ENV: ${process.env.PULSE_SERVER}`)