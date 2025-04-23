import { Server } from "../src/server"
import { updateDevice } from "../src/devices"
import { client, handleMessage } from "../src/mqtt"
import { server as webServer } from "../src/web"
import { Status } from "../src/models"

let server: Server

beforeEach(() => {
    server = new Server(client, ["remote", "player"], 3)
});

afterEach(() => {
    webServer.close()
    server.destroy()
    jest.clearAllMocks();
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

    server.devices[1].type = 'player'
    server.devices[1].status = Status.OK

    let data = {
        "name": "remote",
        "type": "remote"
    }

    handleMessage('activated', JSON.stringify(data), server)

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
        "locations": ["accommodation", "outside"]
    }

    updateDevice(data, server.devices)

    expect(server.devices[1].name).toBe('player')
    expect(server.devices[1].type).toBe('player')
    expect(server.devices[1].timestamp).toBeDefined()
})

test('Disable system', () => {
    server.devices[1].type = 'player'
    server.devices[1].status = Status.OK
    
    let spy = jest.spyOn(client, 'publish')
    expect(server.enabled).toBe(true)

    server.enable(false)

    expect(server.enabled).toBe(false)

    handleMessage('activated', JSON.stringify({name: test}), server)

    expect(spy).not.toHaveBeenCalled()

    server.enable()

    handleMessage('activated', JSON.stringify({name: test}), server)

    expect(spy).toHaveBeenCalled()

    expect(spy).toHaveBeenCalledWith("play", "{\"type\":\"gong\",\"locations\":[\"all\"],\"repeat\":3}")
})

test('Play gong by remote action', () => {
    server.devices[1].type = 'player'
    server.devices[1].status = Status.OK
    
    let spy = jest.spyOn(client, 'publish')

    handleMessage('activated', JSON.stringify({name: test}), server)

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith("play", "{\"type\":\"gong\",\"locations\":[\"all\"],\"repeat\":3}")  
})

test('Play gong by automtion', () => {
    server.devices[1].type = 'player'
    server.devices[1].status = Status.OK
    
    let spy = jest.spyOn(client, 'publish')

    server.playAutomatedGong(['student-accommodation'], 4)

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith("play", "{\"type\":\"gong\",\"locations\":[\"student-accommodation\"],\"repeat\":4}")    
})

test('Only play if players active', () => {
    let spy = jest.spyOn(client, 'publish')

    server.playAutomatedGong(['student-accommodation'], 3)

    expect(spy).not.toHaveBeenCalled()

    server.devices[1].type = 'player'
    server.devices[1].status = Status.OK

    server.playAutomatedGong(['student-accommodation'], 4)

    expect(spy).toHaveBeenCalledWith("play", "{\"type\":\"gong\",\"locations\":[\"student-accommodation\"],\"repeat\":4}")
})