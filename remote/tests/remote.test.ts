import mqtt, { MqttClient } from "mqtt";
import sinon, { SinonStub } from 'sinon';

import { Gpio } from 'onoff';
import { Remote } from "../src/remote"
const mockfs = require('mock-fs')

const EventEmitter = require('events').EventEmitter;
class Client extends EventEmitter {
    // publish() {}
    // subscribe() {}
}

let client: MqttClient;
let led: Gpio
let button: Gpio

let clientOnSpy: SinonStub;
let ledSpy: SinonStub;
let buttonSpy: SinonStub;
let remote: Remote

jest.mock('onoff');
jest.mock('mqtt')

beforeAll(() => {
    let mockClient = new Client();
    sinon.stub(mqtt, 'connect').returns(mockClient);
    client = mqtt.connect('')

    //sinon.stub(mqtt, 'publish')

    led = new Gpio(3, 'out');
    button = new Gpio(2, 'in', 'both');

    clientOnSpy = sinon.stub(client, 'on')
    ledSpy = sinon.stub(led, 'writeSync')
    buttonSpy = sinon.stub(button, 'watch')
});

beforeEach(() => {
    // mockfs({
    //     '/sys/class/gpio/export':''
    // })
    remote = new Remote(client, led, button)
})

afterEach(() => {
    mockfs.restore()
    clearTimeout(remote.timeout);
})

test('Player instance', () => {
    let remote = new Remote(client, led, button)

    expect(remote).toBeDefined()

    expect(clientOnSpy.called).toBe(true)
    expect(ledSpy.called).toBe(true)
})

// test('Message ping', async () => {
//     let remote = await new Remote(client, led, button)

//     //let publishSpy = sinon.stub(client, 'publish')

//     remote.mqttMessage('ping', '')

//     let pongMessage = {
//         "name": "",
//         "type": "remote"
//     }
//     expect(publishSpy.calledOnceWith('pong', JSON.stringify(pongMessage)))
// })

test('ButtonChanged', () => {
    let pressTimeBefore = remote.pressTime
    remote.buttonChanged(undefined, Gpio.LOW)
    //expect(remote.pressTime).toBeGreaterThan(pressTimeBefore)
    expect(remote.timeout).toBeDefined()
})
