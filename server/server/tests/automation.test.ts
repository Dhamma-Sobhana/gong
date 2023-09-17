import { DateTime } from 'luxon'
import { Automation } from '../src/automation'
import { TimeTableEntry } from '../src/models'

jest.useFakeTimers()

beforeEach(() => {
    jest.setSystemTime(DateTime.fromISO('2023-09-17T12:00:00').toJSDate())
})

afterEach(() => {
    jest.clearAllTimers()
})

test('Schedule playing next gong', () => {
    let automation = new Automation()

    expect(automation.job).toBeUndefined()
    expect(automation.called).toBe(false)

    let entry = new TimeTableEntry(DateTime.fromISO('2023-09-17T12:00:00'), '12:01', 'gong', ['all'])
    automation.schedule(entry)
    expect(automation.job).toBeDefined()

    jest.advanceTimersByTime(10000);

    expect(automation.called).toBe(false)

    jest.advanceTimersByTime(60000);

    expect(automation.job).toBeDefined()
    expect(automation.called).toBe(true)
})

test('Cancel schedule', () => {
    let automation = new Automation()

    // @ts-ignore
    expect(automation.job?.nextInvocation()).toBeUndefined()

    let entry = new TimeTableEntry(DateTime.fromISO('2023-09-17T12:00:00'), '12:01', 'gong', ['all'])
    automation.schedule(entry)

    expect(automation.job).toBeDefined()

    // @ts-ignore
    expect(automation.job.nextInvocation()).toBeTruthy()

    automation.cancel()

    expect(automation.job?.nextInvocation()).toBeNull()
})