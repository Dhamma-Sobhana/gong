import { Message } from "../src/models"

test('Instance message', () => {
    let message = new Message()

    expect(message.name).toBe('undefined')
    expect(message.type).toBe(undefined)
    expect(message.zones).toBe(undefined)
})

test('Pong remote message', () => {
    let message = Object.assign(new Message(), {"name": "main-building", "type": "remote"})

    expect(message.name).toBe('main-building')
    expect(message.type).toBe('remote')
    expect(message.zones).toBe(undefined)
})

test('Pong player message', () => {
    let message = Object.assign(new Message(), {"name": "male-house", "type": "player", "zones": ["accommodation"]})

    expect(message.name).toBe('male-house')
    expect(message.type).toBe('player')
    expect(message.zones).toStrictEqual(["accommodation"])
})