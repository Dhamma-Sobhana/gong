import { Server, updateDevice, remoteAction, played } from "../src/server"
import { client } from "../src/mqtt"
import { server as webServer } from "../src/web"

let server: Server

beforeEach(() => {
    server = new Server(client, ["remote", "player"], 3)
});

afterEach(() => {
    client.end()
    webServer.close()
});

test('Server instance', () => {
    expect(server.devices.length).toBe(2)
    expect(server.gongRepeat).toBe(3)
    expect(server.gongPlaying).toBe(false)
})

test('Handle message', () => {
    expect(server.gongPlaying).toBe(false)
    expect(server.devices[0].name).toBe('remote')
    expect(server.devices[0].timestamp).toBeUndefined()

    let data = {
        "name": "remote",
        "type": "remote"
    }

    server.handleMessage('activated', JSON.stringify(data))

    expect(server.gongPlaying).toBe(true)
    expect(server.devices[0].type).toBe('remote')
    expect(server.devices[0].timestamp).toBeDefined()

})

test('Update device list', () => {
    expect(server.devices[1].name).toBe('player')
    expect(server.devices[1].type).toBeUndefined()
    expect(server.devices[1].timestamp).toBeUndefined()

    let data = {
        "name": "player",
        "type": "player",
        "zones": ["accommodation", "outside"]
    }

    updateDevice(data, server.devices)

    expect(server.devices[1].name).toBe('player')
    expect(server.devices[1].type).toBe('player')
    expect(server.devices[1].timestamp).toBeDefined()
})
