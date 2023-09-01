import { getZones } from '../src/lib'

test('get all zones', () => {
    let zonesHandled = ['all']
    let zonesMessage = ['all']

    let result = getZones(zonesHandled, zonesMessage)
    expect(result).toStrictEqual(['all'])
})