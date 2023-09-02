import { Message, PlayMessage, DeviceStatus } from "../src/models"

test('Message instance', () => {
    let message = new Message()

    expect(message.name).toBe('undefined')
    expect(message.type).toBe(undefined)
    expect(message.zones).toBe(undefined)
})

test('Message toString', () => {
    let message = Object.assign(new Message(), {"name": "male-house", "type": "player", "zones": ["accommodation", "outside"]})
    expect(message.toString()).toBe('male-house, player, accommodation,outside')
})

test('Message remote', () => {
    let message = Object.assign(new Message(), {"name": "main-building", "type": "remote"})

    expect(message.name).toBe('main-building')
    expect(message.type).toBe('remote')
    expect(message.zones).toBe(undefined)
})

test('Message player', () => {
    let message = new Message('main-house', ["outside"], 'player')

    expect(message.name).toBe('main-house')
    expect(message.type).toBe('player')
    expect(message.zones).toStrictEqual(["outside"])

    message = new Message('main-house', ["outside"])

    expect(message.name).toBe('main-house')
    expect(message.type).toBeUndefined()
    expect(message.zones).toStrictEqual(["outside"])
})

test('PlayMessage instance', () => {
    let message = new PlayMessage()

    expect(message.zones).toStrictEqual(["all"])
    expect(message.repeat).toBe(4)

    message = new PlayMessage(["accommodation"], 1)

    expect(message.zones).toStrictEqual(["accommodation"])
    expect(message.repeat).toBe(1)
})

test('DeviceStatus instance', () => {
    let status = new DeviceStatus('main-house')

    expect(status.name).toBe('main-house')
})

test('DeviceStatus toString', () => {
    let status = new DeviceStatus('main-house')
    
    expect(status.toString()).toBe('main-house')

    status.type = 'player'

    expect(status.toString()).toContain('main-house (player) Last seen: ')
})

test('DeviceStatus update', () => {
    let now = Date.now()
    let status = new DeviceStatus('main-house')
    status.update()

    expect(status.timestamp).toBeDefined()
    expect(status.timestamp).toBeGreaterThanOrEqual(now)

    status.update('player', ["accommodation","outside"])

    expect(status.type).toBe('player')
    expect(status.zones).toStrictEqual(["accommodation","outside"])
})