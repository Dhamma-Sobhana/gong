import { getZones } from '../src/lib'

test('get all zones', () => {
    let zonesHandled = ['all']
    let zonesMessage = ['all']

    let result = getZones(zonesHandled, zonesMessage)
    expect(result).toStrictEqual(['all'])

    zonesMessage = ['female-house']
    result = getZones(zonesHandled, zonesMessage)
    expect(result).toStrictEqual(['all'])

    zonesHandled = ['female-house']
    zonesMessage = ['all']
    result = getZones(zonesHandled, zonesMessage)
    expect(result).toStrictEqual(['all'])
})

test('get selected zones', () => {
    let zonesHandled = ['female-house', 'male-house']
    let zonesMessage = ['female-house', 'male-house']

    let result = getZones(zonesHandled, zonesMessage)
    expect(result).toStrictEqual(['female-house', 'male-house'])

    zonesMessage = ['female-house']
    result = getZones(zonesHandled, zonesMessage)
    expect(result).toStrictEqual(['female-house'])

    zonesMessage = ['outside']
    result = getZones(zonesHandled, zonesMessage)
    expect(result).toStrictEqual([])
})