import { DateTime } from 'luxon'
import { DisabledEntries } from '../src/models'
import { getCacheFilePath, getSettingsFilePath, readDisabledEntries, readSettings, writeDisabledEntries, writeSettings } from '../src/storage'

const fs = require('fs');

beforeEach(() => {
    if (fs.existsSync(getSettingsFilePath()))
        fs.unlinkSync(getSettingsFilePath());
})

test('Get cache file name', async () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(getCacheFilePath()).toBe('./schedule.json')

    process.env.NODE_ENV = 'production'
    expect(getCacheFilePath()).toBe('/data/schedule.json')
    process.env.NODE_ENV = 'test'
})

test('Get settings file name', async () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(getSettingsFilePath()).toBe('./settings.json')

    process.env.NODE_ENV = 'production'
    expect(getSettingsFilePath()).toBe('/data/settings.json')
    process.env.NODE_ENV = 'test'
})


test('Write and read settings', async () => {
    let write:any = {"disabledEntries": ["2024-01-02T13:00:00.000+01:00", "2024-01-02T14:15:00.000+01:00"]}
    writeSettings(write)

    let read:any = readSettings()

    expect(read).toMatchObject(write)
})

test('Create settings file if not existing', () => {
    expect(fs.existsSync(getSettingsFilePath())).toBeFalsy()
    let de = readDisabledEntries()

    writeDisabledEntries(de)

    expect(fs.existsSync(getSettingsFilePath())).toBeTruthy()
})

test('Write and read disabled gong entries', () => {
    jest.useFakeTimers()
    jest.setSystemTime(DateTime.fromISO("2024-01-01").toJSDate())

    let de = new DisabledEntries();
    de.update(DateTime.fromISO("2024-01-02T13:00:00.000+01:00"), false)
    de.update(DateTime.fromISO("2024-01-02T14:15:00.000+01:00"), false)

    writeDisabledEntries(de)

    de = readDisabledEntries()

    expect(de.entries.length).toBe(2)
    expect(de.entries[0]).toEqual(DateTime.fromISO("2024-01-02T13:00:00.000+01:00"))
    expect(de.entries[1]).toEqual(DateTime.fromISO("2024-01-02T14:15:00.000+01:00"))

    jest.setSystemTime(DateTime.fromISO("2024-01-02T13:15:00.000+01:00").toJSDate())

    writeDisabledEntries(de)

    expect(de.entries.length).toBe(1)
    expect(de.entries[0]).toEqual(DateTime.fromISO("2024-01-02T14:15:00.000+01:00"))
})

test('Disable gong entry', () => {
    let entry = DateTime.fromISO("2024-01-02T13:00:00.000+01:00")
    let de = new DisabledEntries();
    
    de.update(entry, false)
    expect(de.entries.length).toBe(1)
})


test('Remove old entries', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2024, 0, 2, 14))

    let de = new DisabledEntries();
    de.update(DateTime.fromISO("2024-01-02T13:00:00.000+01:00"), false)
    de.update(DateTime.fromISO("2024-01-02T14:15:00.000+01:00"), false)

    expect(de.entries.length).toBe(2)

    de.cleanup()

    expect(de.entries.length).toBe(1)
})
