const Gpio = require('onoff').Gpio;
let mqtt = require('mqtt');

let server = process.env.MQTT_SERVER || 'localhost'
let name = process.env.NAME

// Configuration
const threashold = 5000;
const initialToggleTime = 500;
const minToggleTime = 100;
const toggleDelta = 30;
const ledPin = process.env.LED_PIN || 3;
const buttonPin = process.env.BUTTON_PIN || 2;

// Setup led and button
const led = new Gpio(ledPin, 'out');
const button = new Gpio(buttonPin, 'in', 'both');

// Initial values
let active = 0;
let toggle = 0;
led.writeSync(toggle);
let pressTime = Date.now();
let timeout = null;

// MQTT
let client  = mqtt.connect(`mqtt://${server}`);

function sendButtonState() {
    let now = new Date().getTime()
    let payload = {
      "type": "gong",
      "areas": [0]
    }
    client.publish(`play`, JSON.stringify(payload));
  }

/**
 * Button state changed.
 * Activate led and start alternating timer
 */
button.watch((err, value) => {
    if (err) {
      throw err;
    }

    if (value == Gpio.LOW) { //  Button presseed
        if (timeout !== null)
            return;
        
        pressTime = Date.now();
        let toggleTime = reset(active);

        timeout = setTimeout(alternate, toggleTime, toggleTime);
        led.writeSync(Gpio.HIGH);
        console.log('pressed');
    } else { // Button released
        reset();
        console.log('released');
        led.writeSync(active);
    }
});

/**
 * Cancel timer
 * @param {boolean} active current state 
 * @returns initial toggle time
 */
function reset(active) {
    clearTimeout(timeout);
    timeout = null;
    if (active)
        return minToggleTime;
    else
        return initialToggleTime;
}

/**
 * Change the length of time in current state
 * @param {int} toggleTime current length
 * @param {boolean} active current state
 * @returns the updated time
 */
function updateToggleTime(toggleTime, active) {
    if (active)
        toggleTime += toggleDelta;
    else
        toggleTime -= toggleDelta;

    if (toggleTime < minToggleTime)
        toggleTime = minToggleTime;
    else if (toggleTime > initialToggleTime)
        toggleTime = initialToggleTime;

    return toggleTime;
};

function toggleState() {
    if (toggle == 0)
        toggle = 1
    else
        toggle = 0
}

/**
 * Change led state or active state if button held long enough
 * @param {int} toggleTime current length
 * @returns nothing
 */
function alternate(toggleTime) {
    // Hold for long eough
    if (Date.now() > (pressTime + threashold)) {
        if (active) {
            console.log('deactivate');
            active = 0;
        } else {
            console.log('activate');
            active = 1;
            sendButtonState();
        }
        
        led.writeSync(active);
        clearTimeout(timeout);
        return;
    }

    // Blink led
    toggleState();
    led.writeSync(toggle);
    toggleTime = updateToggleTime(toggleTime, active);
    timeout = setTimeout(alternate, toggleTime, toggleTime);
}

console.log(`Gong remote starting.\n\nName: ${name}\nServer: ${server}\n\nConnecting to MQTT server..`)