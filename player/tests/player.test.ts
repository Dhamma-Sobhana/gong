import mqtt, { MqttClient } from "mqtt";
import sinon, { SinonStub } from 'sinon';

import { AuthInfo, ClientInfo, ServerInfo } from '@tmigone/pulseaudio';

import { Player } from "../src/player"
import BalenaAudio from "balena-audio";
import { typeStringToFileName } from "../src/lib";

const EventEmitter = require('events').EventEmitter;
class Client extends EventEmitter { }
class Audio extends BalenaAudio { }

let player: Player

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

beforeEach(() => {
    player = new Player(client, audio, "player", ["outside"])
})

afterEach(() => {
    player.destroy()
})

test('Player instance', async () => {
    expect(player).toBeDefined()

    expect(clientOnSpy.called).toBe(true)
    expect(audioListenSpy.called).toBe(true)
})

test('Type to file path', () => {
    expect(typeStringToFileName('gong')).toEqual('./sound/gong-8s.mp3')
    expect(typeStringToFileName('unknown')).toEqual('./sound/gong-8s.mp3')
    expect(typeStringToFileName('silence')).toEqual('./sound/silence-8s.mp3')
    expect(typeStringToFileName('beep')).toEqual('./sound/beep.mp3')
})