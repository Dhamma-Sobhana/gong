import mqtt, { MqttClient } from "mqtt";
import sinon, { SinonStub } from 'sinon';

import { AuthInfo, ClientInfo, ServerInfo } from '@tmigone/pulseaudio';

import { Player } from "../src/player"
import BalenaAudio from "balena-audio";

const EventEmitter = require('events').EventEmitter;
class Client extends EventEmitter { }
class Audio extends BalenaAudio { }

let client: MqttClient;
let audio: BalenaAudio

let clientOnSpy: SinonStub;
let audioListenSpy: SinonStub;
let audioSetVolumeSpy: SinonStub;

beforeAll(() => {
    let mockClient = new Client();
    sinon.stub(mqtt, 'connect').returns(mockClient);
    client = mqtt.connect('')

    sinon.createStubInstance(BalenaAudio)
    audio = new BalenaAudio('unix:/run/pulse/pulseaudio.socket')

    clientOnSpy = sinon.stub(client, 'on')
    audioListenSpy = sinon.stub(audio, 'listen').resolves()
    audioSetVolumeSpy = sinon.stub(audio, 'setVolume').resolves()
});

test('Player instance', async () => {
    let player = await new Player(client, audio, "player", ["outside"])

    expect(player).toBeDefined()

    expect(clientOnSpy.called).toBe(true)
    expect(audioListenSpy.called).toBe(true)
    expect(audioSetVolumeSpy.called).toBe(true)
})