const Gpio = require('onoff').Gpio;
let mqtt = require('mqtt');

let server = process.env.MQTT_SERVER || 'localhost'
let name = process.env.NAME

// Configuration
const threasholdActivate = 2000;
const threasholdCancel = 40;
const initialToggleTime = 300;
const minToggleTime = 100;
const toggleDelta = 30;

// MQTT
let client  = mqtt.connect(`mqtt://${server}`);
let topics = ['ping', 'play', 'played', 'stop']

class Button {

    led;
    button;

    active;
    toggle;
    pressTime;
    timeout;

    constructor(ledPin, buttonPin) {
        this.led = new Gpio(ledPin, 'out');
        this.button = new Gpio(buttonPin, 'in', 'both');
        

        this.active = 0;
        this.toggle = 0;
        this.led.writeSync(this.toggle);
        this.pressTime = Date.now();
        this.timeout = null;

        this.button.watch((err, value) => this.buttonChanged(err, value))

        client.on('connect', () => {
            this.mqttConnect()
        })
    
        client.on('message', (topic, message) => {
            this.mqttMessage(topic, message)
        })
    }

    /**
     * Subscribe to topics and send alive message
     */
    mqttConnect = () => {
        console.log('Connected! Listening for topics:\n', topics.join(', '))
        for (let topic of topics) {
            client.subscribe(topic)
        }

        // Send message telling that the device is alive
        this.sendPong()
    }

    /**
     * Handle subscribed messages received
     */
    mqttMessage = (topic, message) => {
        console.log(`Message. Topic: '${topic}' Message: '${message}'`)

        // Parse message to JSON, if any
        let data = undefined
        try {
            data = JSON.parse(message)
        } catch {}

        if (topic === 'ping') {
            this.sendPong()
        } else if (topic === 'stop' || topic === 'played') {
            this.active = 0;
            this.led.writeSync(this.active);
        } else if (topic === 'play') {
            this.active = 1;
            this.led.writeSync(this.active);
        }
    }

    sendButtonState = () => {
        client.publish('activated')
    }

    /**
     * Button state changed.
     * Activate led and start alternating timer
     */
    buttonChanged  = (err, value) => {
        if (err) {
            throw err;
        }

        if (value == Gpio.LOW) { //  Button presseed            
            if (this.timeout !== null)
                return;
            
            this.pressTime = Date.now();
            this.reset();

            this.timeout = setTimeout(this.alternate, this.toggleTime);
            this.led.writeSync(Gpio.HIGH);
            console.log('Button pressed');
        } else { // Button released
            this.reset();
            console.log('Button released');
            this.led.writeSync(this.active);
        }
    }

    /**
     * Cancel timer
     * @returns initial toggle time
     */
    reset() {
        clearTimeout(this.timeout);
        this.timeout = null;
        if (this.active)
            this.toggleTime = minToggleTime;
        else
            this.toggleTime = initialToggleTime;
    }

    /**
     * Change the length of time in current state
     */
    updateToggleTime() {
        let toggleTime = this.toggleTime;
        let active = this.active;
        
        if (active)
            toggleTime += toggleDelta;
        else
            toggleTime -= toggleDelta;

        if (toggleTime < minToggleTime)
            toggleTime = minToggleTime;
        else if (toggleTime > initialToggleTime)
            toggleTime = initialToggleTime;

        this.toggleTime = toggleTime;
    }

    toggleState() {
        if (this.toggle == 0)
            this.toggle = 1
        else
            this.toggle = 0
    }

    /**
     * Change led state or active state if button held long enough
     * Important that this is defined as an arrow function so that
     * other methods in this class can be called.
     * @returns nothing
     */
    alternate = () => {
        // Hold for long enough
        let threashold = this.active ? threasholdCancel : threasholdActivate

        if (Date.now() > (this.pressTime + threashold)) {
            if (this.active) {
                console.log('State deactivated');
                this.active = 0;
            } else {
                console.log('State activated');
                this.active = 1;
            }

            this.sendButtonState();
            
            this.led.writeSync(this.active);
            clearTimeout(this.timeout);
            return;
        }

        // Blink led
        this.toggleState();
        this.led.writeSync(this.toggle);
        this.updateToggleTime();
        this.timeout = setTimeout(this.alternate, this.toggleTime);
    }

    sendPong() {
        let payload = {
            "name": name,
            "type": "remote"
        }
        client.publish(`pong`, JSON.stringify(payload));
    }
}

const button = new Button(process.env.LED_PIN || 3, process.env.BUTTON_PIN || 2);

console.log(`Gong remote starting.\n\nName: ${name}\nServer: ${server}\n\nConnecting to MQTT server..`)