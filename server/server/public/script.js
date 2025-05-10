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
const topics = ['play', 'stop', 'reload-ui']

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

    if (topic === 'play') {
        playGong(message);
    } else if (topic === 'stop') {
        stopGong();
        client.end()
        location.reload()
    } else if (topic === 'reload-ui') {
        client.end()
        location.reload()
    }
})

window.onbeforeunload = function(event) {
    client.end()
    console.log('Client disconnected')
};

function formatTimeTillNextGong(nextGong) {
    let now = DateTime.now()
    let future = DateTime.fromISO(nextGong)
    let diff = future.diff(now, ['hours', 'minutes', 'seconds'])

    if (diff < 0)
        return ''
    else if (diff.hours <= 0)
        return diff.toFormat("m:ss")

    return diff.toFormat("h:mm:ss")
}

function tickSystemTime(currentTime) {
    return DateTime.fromISO(currentTime).plus({seconds: 1})
}

/* Local playback */

function playGong(message, test = false) {
    const enabled = (localStorage.getItem('play-locally-enabled') === 'true');
    const location = localStorage.getItem('play-locally-location');
    const repeat = localStorage.getItem('play-locally-repeat');

    console.log('Playing sound', enabled, test, location, repeat);

    if (!test && !enabled)
        return

    message = JSON.parse(message);
    let locationHandled = message.locations.some(r=> ["all", location].includes(r))
    
    console.log('Location handled', locationHandled);

    if (!locationHandled)
        return

    let audio = document.getElementById('play-locally');
    let repeatCount = repeat;
    
    audio.muted = false;
    audio.currentTime = 0;
    audio.volume = 0.5;

    audio.onended = (event) => {
        console.log('Audio ended', repeatCount);
        repeatCount--;
        audio.volume = 1;

        if (repeatCount > 0) {
            audio.play();
        }
    };

    audio.play();

    // While playing gong, prevent Android Kiosk reloading due to idle timeout
    if (typeof(Android) !== 'undefined')
        Android.delayIdleTimeout();
    else
        console.log('Not running on Android');
}

function stopGong() {
    const audio = document.getElementById('play-locally');
    audio.pause();
    audio.currentTime = 0;
}