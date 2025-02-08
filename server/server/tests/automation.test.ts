import { DateTime } from 'luxon'

import { Automation } from '../src/automation'
import { TimeTableEntry } from '../src/models'

jest.useFakeTimers()
const locationId = 1392
const callback = jest.fn();
let automation = new Automation(callback, locationId, false)

beforeEach(() => {
    jest.setSystemTime(DateTime.fromISO('2023-09-17T12:00:00').toJSDate())
})

afterEach(() => {
    automation.cancel()
    jest.clearAllTimers()  
    jest.clearAllMocks();
})

test('Schedule playing next gong', () => {
    expect(automation.job).toBeUndefined()
    expect(callback).not.toBeCalled();

    let entry = new TimeTableEntry(DateTime.fromISO('2023-09-17T12:00:00'), '12:01', 'gong', ['accommodation'], 'Default', 0)
    automation.scheduleGong(entry)
    expect(automation.job).toBeDefined()
    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(10000);

    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(60000);

    expect(automation.job).toBeDefined()
    expect(callback).toBeCalled();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(["accommodation"])
})

test('Cancel schedule', () => {
    // @ts-ignore
    expect(automation.job?.nextInvocation()).toBeFalsy()
    expect(callback).not.toBeCalled();

    let entry = new TimeTableEntry(DateTime.fromISO('2023-09-17T12:00:00'), '12:01', 'gong', ['accommodation'], 'Default', 0)
    automation.scheduleGong(entry)

    expect(callback).not.toBeCalled();

    expect(automation.job).toBeDefined()

    // @ts-ignore
    expect(automation.job.nextInvocation()).toBeTruthy()

    automation.cancel()

    expect(automation.job?.nextInvocation()).toBeNull()
    expect(callback).not.toBeCalled();
})

test('Enable and disable automation', () => {
    expect(automation.enabled).toBe(false)

    automation.enable()

    expect(automation.enabled).toBe(true)

    automation.enable(false)

    expect(automation.enabled).toBe(false)
})

test('Fetch courses', () => {
    expect(automation.schedule.getCourses().length).toBeGreaterThan(0)
})

test('Daylight saving spring', () => {
    // Swedish DST spring 2024: Under natten från lördag 30 mars 2024 till söndag 31 mars 2024, 02:00 -> 03:00
    jest.setSystemTime(DateTime.fromISO('2024-03-30T22:00:00').toJSDate())

    let entry = new TimeTableEntry(DateTime.fromISO('2024-03-31T04:00:00'), '04:00', 'gong', ['student-accommodation'], 'Default', 0)
    automation.scheduleGong(entry)

    expect(callback).not.toBeCalled();
    expect(DateTime.now().toISO()).toEqual(DateTime.fromISO('2024-03-30T22:00:00+01:00').toISO())

    jest.advanceTimersByTime(4 * 3600 * 1000 - 1000);
    expect(DateTime.now().toISO()).toEqual(DateTime.fromISO('2024-03-31T01:59:59+01:00').toISO())

    jest.advanceTimersByTime(1000);
    expect(DateTime.now().toISO()).toEqual(DateTime.fromISO('2024-03-31T03:00:00+02:00').toISO())
    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(1 * 3600 * 1000 - 1000);
    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(1000);
    expect(callback).toBeCalled();
})


test('Daylight saving autumn', () => {
    // Swedish DST autumn 2024: Under natten från lördag 26 oktober 2024 till söndag 27 oktober 2024, 03:00 -> 02.00
    jest.setSystemTime(DateTime.fromISO('2024-10-26T22:00:00').toJSDate())

    let entry = new TimeTableEntry(DateTime.fromISO('2024-10-27T04:00:00'), '04:00', 'gong', ['student-accommodation'], 'Default', 0)
    automation.scheduleGong(entry)

    expect(callback).not.toBeCalled();
    expect(DateTime.now().toISO()).toEqual(DateTime.fromISO('2024-10-26T22:00:00+02:00').toISO())
    
    jest.advanceTimersByTime(4 * 3600 * 1000);
    expect(DateTime.now().toISO()).toBe(DateTime.fromISO('2024-10-27T02:00:00+02:00').toISO())
    
    jest.advanceTimersByTime(1 * 3600 * 1000 - 1000);
    expect(DateTime.now().toISO()).toBe(DateTime.fromISO('2024-10-27T02:59:59+02:00').toISO())

    jest.advanceTimersByTime(1000);
    expect(DateTime.now().toISO()).toBe(DateTime.fromISO('2024-10-27T02:00:00+01:00').toISO())

    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(1 * 3600 * 1000);
    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(1 * 3600 * 1000);
    expect(callback).toBeCalled();
})