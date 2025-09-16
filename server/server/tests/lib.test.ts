import { DateTime } from 'luxon'
import { getGongTypeByName, getGongTypes, getLocations, getManualEntry } from '../src/lib'

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

test('Get manual activation location based on time', () => {
    let entry
    entry = getManualEntry(DateTime.fromFormat('00:00', 'HH:mm'))
    expect(entry.locations).toEqual([])

    entry = getManualEntry(DateTime.fromFormat('03:44', 'HH:mm'))
    expect(entry.locations).toEqual([])

    entry = getManualEntry(DateTime.fromFormat('03:45', 'HH:mm'))
    expect(entry.locations).toEqual(['student-accommodation'])
    expect(entry.repeat).toEqual(8)

    entry = getManualEntry(DateTime.fromFormat('06:14', 'HH:mm'))
    expect(entry.locations).toEqual(['student-accommodation'])
    expect(entry.repeat).toEqual(8)

    entry = getManualEntry(DateTime.fromFormat('06:15', 'HH:mm'))
    expect(entry.locations).toEqual(['all'])
    expect(entry.repeat).toEqual(undefined)

    entry = getManualEntry(DateTime.fromFormat('21:59', 'HH:mm'))
    expect(entry.locations).toEqual(['all'])
    expect(entry.repeat).toEqual(undefined)

    entry = getManualEntry(DateTime.fromFormat('22:00', 'HH:mm'))
    expect(entry.locations).toEqual([])


    entry = getManualEntry(DateTime.fromFormat('23:59', 'HH:mm'))
    expect(entry.locations).toEqual([])
})


const expectedFileNames = ['public/sounds/brass-bowl.mp3', 'public/sounds/big-ben.mp3', 'public/sounds/big-gong.mp3', 'public/sounds/silence.mp3', 'public/sounds/beep.mp3']

test('Gong sounds exist', () => {
    const fs = require('fs');
    const path = require('path');

    for (let type of getGongTypes(true)) {
        let file_name = `public/${getGongTypeByName(type.name).file_name}`
        expect(expectedFileNames).toContain(file_name)
        expect(fs.existsSync(path.resolve(file_name))).toBe(true)
    }
})