import { Message } from '../src/models'

test('Message instance', () => {
    let message = new Message('main-house', ["outside"], 'player')

    expect(message.name).toBe('main-house')
    expect(message.type).toBe('player')
    expect(message.zones).toStrictEqual(["outside"])

    message = new Message('main-house', ["outside"])

    expect(message.name).toBe('main-house')
    expect(message.type).toBeUndefined()
    expect(message.zones).toStrictEqual(["outside"])
})