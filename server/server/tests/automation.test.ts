import { DateTime } from 'luxon'
import { Automation } from '../src/automation'
import { TimeTableEntry } from '../src/models'

jest.useFakeTimers()
const locationId = 1392

beforeEach(() => {
    jest.setSystemTime(DateTime.fromISO('2023-09-17T12:00:00').toJSDate())
})

afterEach(() => {
    jest.clearAllTimers()  
    jest.clearAllMocks();
})

const callback = jest.fn();

test('Schedule playing next gong', () => {
    let automation = new Automation(callback, locationId)

    expect(automation.job).toBeUndefined()
    expect(callback).not.toBeCalled();

    let entry = new TimeTableEntry(DateTime.fromISO('2023-09-17T12:00:00'), '12:01', 'gong', ['accommodation'])
    automation.schedule(entry)
    expect(automation.job).toBeDefined()
    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(10000);

    expect(callback).not.toBeCalled();

    jest.advanceTimersByTime(60000);

    expect(automation.job).toBeDefined()
    expect(callback).toBeCalled();
    expect(callback).toHaveBeenCalledTimes(1);
})

test('Cancel schedule', () => {
    let automation = new Automation(callback, locationId)

    // @ts-ignore
    expect(automation.job?.nextInvocation()).toBeUndefined()
    expect(callback).not.toBeCalled();

    let entry = new TimeTableEntry(DateTime.fromISO('2023-09-17T12:00:00'), '12:01', 'gong', ['accommodation'])
    automation.schedule(entry)

    expect(callback).not.toBeCalled();

    expect(automation.job).toBeDefined()

    // @ts-ignore
    expect(automation.job.nextInvocation()).toBeTruthy()

    automation.cancel()

    expect(automation.job?.nextInvocation()).toBeNull()
    expect(callback).not.toBeCalled();
})

test('Enable and disable automation', () => {
    let automation = new Automation(callback, locationId)

    expect(automation.enabled).toBe(false)

    automation.enable()

    expect(automation.enabled).toBe(true)

    automation.enable(false)

    expect(automation.enabled).toBe(false)
})

test('Fetch courses', () => {
    let automation = new Automation(callback, locationId)

    expect(automation.courses).toBeTruthy()
})