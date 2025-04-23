import { DateTime } from "luxon"
import { Message, PlayMessage, DeviceStatus, Status, State } from "../src/models"
import { readManualEntries } from "../src/storage"

test('Message instance', () => {
    let message = new Message()

    expect(message.name).toBe('undefined')
    expect(message.type).toBe(undefined)
    expect(message.locations).toBe(undefined)
})

test('Message toString', () => {
    let message = Object.assign(new Message(), { "name": "male-house", "type": "player", "locations": ["accommodation", "outside"] })
    expect(message.toString()).toBe('male-house, player, accommodation,outside')
})

test('Message remote', () => {
    let message = Object.assign(new Message(), { "name": "main-building", "type": "remote" })

    expect(message.name).toBe('main-building')
    expect(message.type).toBe('remote')
    expect(message.locations).toBe(undefined)
})

test('Message with status', () => {
    let message = new Message('test', ['all'], 'remote')
    expect(message.status).toBe(Status.OK)

    message = new Message('test', ['all'], 'remote', 'warning')
    expect(message.status).toBe(Status.Warning)

    message = new Message('test', ['all'], 'remote', 'failed')
    expect(message.status).toBe(Status.Failed)

    message = new Message('test', ['all'], 'remote', 'disabled')
    expect(message.status).toBe(Status.Disabled)
})

test('Message player', () => {
    let message = new Message('main-house', ["outside"], 'player')

    expect(message.name).toBe('main-house')
    expect(message.type).toBe('player')
    expect(message.locations).toStrictEqual(["outside"])

    message = new Message('main-house', ["outside"])

    expect(message.name).toBe('main-house')
    expect(message.type).toBeUndefined()
    expect(message.locations).toStrictEqual(["outside"])
})

test('PlayMessage instance', () => {
    let message = new PlayMessage()

    expect(message.locations).toStrictEqual(["all"])
    expect(message.repeat).toBe(4)

    message = new PlayMessage('gong', ["accommodation"], 1)

    expect(message.locations).toStrictEqual(["accommodation"])
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
    let status = new DeviceStatus('main-house')
    status.update()

    expect(status.timestamp).toBeDefined()
    expect(status.timestamp).toBeInstanceOf(DateTime)

    status.update('player', ["accommodation", "outside"])

    expect(status.type).toBe('player')
    expect(status.locations).toStrictEqual(["accommodation", "outside"])

    status.update('player', undefined, undefined, State.Playing)
    expect(status.state).toEqual(State.Playing)
})

test('Read manual configuration from file', () => {
    let manual = readManualEntries()
    
    expect(manual.length).toBe(2)
    expect(manual[0].from.toFormat('HH:mm')).toBe("03:45")
    expect(manual[0].to.toFormat('HH:mm')).toBe("06:15")
    expect(manual[0].locations).toEqual(["student-accommodation"])
    expect(manual[0].repeat).toBe(8)
})