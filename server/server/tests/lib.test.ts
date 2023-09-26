import { getLocations } from '../src/lib'

test('get all locations', () => {
    let locationsHandled = ['all']
    let locationsMessage = ['all']

    let result = getLocations(locationsHandled, locationsMessage)
    expect(result).toStrictEqual(['all'])

    locationsMessage = ['female-house']
    result = getLocations(locationsHandled, locationsMessage)
    expect(result).toStrictEqual(['all'])

    locationsHandled = ['female-house']
    locationsMessage = ['all']
    result = getLocations(locationsHandled, locationsMessage)
    expect(result).toStrictEqual(['all'])
})

test('get selected locations', () => {
    let locationsHandled = ['female-house', 'male-house']
    let locationsMessage = ['female-house', 'male-house']

    let result = getLocations(locationsHandled, locationsMessage)
    expect(result).toStrictEqual(['female-house', 'male-house'])

    locationsMessage = ['female-house']
    result = getLocations(locationsHandled, locationsMessage)
    expect(result).toStrictEqual(['female-house'])

    locationsMessage = ['outside']
    result = getLocations(locationsHandled, locationsMessage)
    expect(result).toStrictEqual([])
})