import { Message, PlayMessage } from "../src/models"

test('Instance Message', () => {
    let message = new Message()

    expect(message.name).toBe('undefined')
    expect(message.type).toBe(undefined)
    expect(message.zones).toBe(undefined)
})

test('Pong remote Message', () => {
    let message = Object.assign(new Message(), {"name": "main-building", "type": "remote"})

    expect(message.name).toBe('main-building')
    expect(message.type).toBe('remote')
    expect(message.zones).toBe(undefined)
})

test('Pong player Message', () => {
    let message = Object.assign(new Message(), {"name": "male-house", "type": "player", "zones": ["accommodation"]})

    expect(message.name).toBe('male-house')
    expect(message.type).toBe('player')
    expect(message.zones).toStrictEqual(["accommodation"])
})

test('Instance default PlayMessage', () => {
    let message = new PlayMessage()

    expect(message.zones).toStrictEqual(["all"])
    expect(message.repeat).toBe(4)
})

test('Instance custom PlayMessage', () => {
    let message = new PlayMessage(["accommodation"], 1)

    expect(message.zones).toStrictEqual(["accommodation"])
    expect(message.repeat).toBe(1)
})