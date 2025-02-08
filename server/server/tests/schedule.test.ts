const fs = require('fs');
import path from 'path';

import { DateTime } from 'luxon';

import { timeTableExists, getTimeTableJson, getTimeTable, getCourseDayByDate, getCoursesByDate, mergeSchedules, Schedule } from '../src/schedule';
import { DisabledEntries, TimeTable } from '../src/models';
import { parseSchedule } from '../src/fetch';

let data:any
let schedule:Schedule

beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2023, 8, 15, 12))
    data = JSON.parse(fs.readFileSync(path.resolve(__dirname, './resources/schedule.json')));
    schedule = new Schedule(parseSchedule(data))
})

test('Time table exists', () => {
    expect(timeTableExists('ServicePeriod')).toBe(true);
    expect(timeTableExists('10-Day')).toBe(true);
    expect(timeTableExists('UnknownType')).toBe(false);
});

test('Get TimeTable Json', () => {
    expect(getTimeTableJson('unknown').days.default.length).toBe(0);
    expect(getTimeTableJson(undefined).days.default.length).toBe(3);
    expect(getTimeTableJson('ServicePeriod').days.default.length).toBe(3);
    expect(getTimeTableJson('10-Day').days[11].length).toBe(2);
});

test('Get TimeTable', () => {
    let date = DateTime.fromISO('2023-09-15');
    expect(getTimeTable('UnknownType', date, 0).entries.length).toBe(0);

    let timeTable = getTimeTable('ServicePeriod', date, 1);

    expect(timeTable.courseType).toBe('ServicePeriod')

    expect(timeTable.entries.length).toBe(3);
    let entry = timeTable.entries[0];
    expect(entry.time.day).toBe(15);
    expect(entry.time.hour).toBe(7);
    expect(entry.time.minute).toBe(20);
    expect(entry.time.second).toBe(0);
    expect(entry.type).toBe('gong');
    expect(entry.location).toStrictEqual(['all']);

    expect(getTimeTable('10-Day', date, 11).entries.length).toBe(2);
});

test('Get schedule by date', () => {
    let today = DateTime.fromObject({ year: 2023, month: 9, day: 1, hour: 12 });
    let result = getCoursesByDate(schedule.courses, today);
    expect(result).toBeDefined();

    expect(result.length).toBe(1);
    expect(result[0]['start'].toISODate()).toBe('2023-08-30');
    expect(result[0]['type']).toBe('3-DayOSC');

    today = DateTime.fromObject({ year: 2023, month: 9, day: 18, hour: 12 });
    result = getCoursesByDate(schedule.courses, today);

    if (result) {
        expect(result[0]['type']).toBe('ServicePeriod');
    }
});

test('Get default when no ongoing course', () => {
    let today = DateTime.fromObject({ year: 2023, month: 8, day: 29, hour: 12 });
    let result = getCoursesByDate(schedule.courses, today);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe('default');
});

test('Get day with multiple courses', () => {
    let today = DateTime.fromObject({ year: 2023, month: 9, day: 17, hour: 12 });
    let result = getCoursesByDate(schedule.courses, today);

    expect(result.length).toBe(2);
    expect(result[0].type).toBe('10-Day');
    expect(result[1].type).toBe('ServicePeriod');
});

test('Get course day by date', () => {
    let date = DateTime.fromISO('2023-09-17T00:00:00');
    let result = getCourseDayByDate(schedule.courses[4], date);

    expect(result).toBe(11);

    date = DateTime.fromISO('2023-09-12T23:59:59');
    result = getCourseDayByDate(schedule.courses[4], date);

    expect(result).toBe(6);

    date = DateTime.fromISO('2023-09-06T23:59:59');
    result = getCourseDayByDate(schedule.courses[4], date);

    expect(result).toBe(0);
});

test('Get timetable with default day on dynamic course', () => {
    let date = DateTime.fromISO('2023-09-06T00:00:00');
    let course = schedule.courses[4]
    expect(getCourseDayByDate(course, date)).toBe(0)

    let timeTable = getTimeTable('10-Day', date, getCourseDayByDate(course, date))

    expect(timeTable).toBeDefined()
    expect(timeTable.entries.length).toBe(0)

    date = DateTime.fromISO('2023-09-08T00:00:00');
    expect(getCourseDayByDate(course, date)).toBe(2)

    timeTable = getTimeTable('10-Day', date, getCourseDayByDate(course, date))

    expect(timeTable).toBeDefined()
    expect(timeTable.entries[4].time.hour).toBe(14)
    expect(timeTable.entries[4].time.minute).toBe(15)

    date = DateTime.fromISO('2023-09-10T00:00:00');
    expect(getCourseDayByDate(course, date)).toBe(4)

    timeTable = getTimeTable('10-Day', date, getCourseDayByDate(course, date))

    expect(timeTable).toBeDefined()
    expect(timeTable.entries[4].time.hour).toBe(13)
    expect(timeTable.entries[4].time.minute).toBe(50)
})

test('Merge schedules', () => {
    let date = DateTime.fromISO('2023-09-17T12:00:00');
    let courses = getCoursesByDate(schedule.courses, date);
    expect(courses.length).toBe(2);
    let timeTables: Array<TimeTable> = [];
    for (let course of courses) {
        timeTables.push(getTimeTable(course.type, date, getCourseDayByDate(course, date)));
    }
    expect(timeTables.length).toBe(2);
    expect(timeTables[0].entries.length).toBe(2);
    expect(timeTables[1].entries.length).toBe(3);

    //console.log(courses, timeTables)
    let result = mergeSchedules(timeTables);

    expect(result.entries.length).toBe(4);
    expect(result.entries[1].time.hour).toBe(4);
    expect(result.entries[1].time.minute).toBe(20);
    expect(result.entries[2].time.hour).toBe(14);
    expect(result.entries[2].time.minute).toBe(20);
});

test('Get Schedule', () => {
    let date = DateTime.fromISO('2023-09-17T12:00:00');
    jest.setSystemTime(date.toJSDate());

    let _schedule = schedule.getScheduleByDate(date);

    expect(_schedule.courseType).toBe('mixed');
    expect(_schedule.entries.length).toBe(4);
    expect(_schedule.entries[1].time.hour).toBe(4);
    expect(_schedule.entries[1].time.minute).toBe(20);
    expect(_schedule.entries[2].time.hour).toBe(14);
    expect(_schedule.entries[2].time.minute).toBe(20);
});

test('Get Gong Schedule for today and tomorrow', () => {
    let today = schedule.getScheduleByDate(DateTime.fromISO('2023-09-17T12:00:00'));
    expect(today.entries.length).toBe(4);

    let tomorrow = schedule.getScheduleByDate(DateTime.fromISO('2023-09-18T12:00:00'));
    expect(tomorrow.entries.length).toBe(3);
});

test('Get next gong', () => {
    jest.setSystemTime(DateTime.fromISO('2023-09-17T03:00:15').toJSDate());

    let result = schedule.getNextGong();

    expect(result).toBeDefined();
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].hour).toBe(4);
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].minute).toBe(0);
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].second).toBe(0);

    jest.setSystemTime(DateTime.fromISO('2023-09-17T12:00:00').toJSDate());

    result = schedule.getNextGong()

    // @ts-ignore
    expect(result['time'].day).toBe(17)
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].hour).toBe(14);
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].minute).toBe(20);
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].second).toBe(0);
    /* ts-ignore */

    jest.setSystemTime(DateTime.fromISO('2023-09-17T20:00:00').toJSDate());

    result = schedule.getNextGong();

    // @ts-ignore
    expect(result['time'].day).toBe(18)
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].hour).toBe(7);
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].minute).toBe(20);
});


test('Disabled entry and get next gong', () => {
    let date = DateTime.fromISO('2023-09-17T12:00:00');
    jest.setSystemTime(date.toJSDate());

    let time_table = schedule.getSchedule();
    expect(time_table.entries.length).toBe(7);

    let entry = time_table.entries[0]
    expect(entry.time).toEqual(DateTime.fromISO('2023-09-17T04:00:00.000+02:00'))

    expect(schedule.getNextGong()?.time).toEqual(DateTime.fromISO('2023-09-17T14:20:00.000+02:00'))

    schedule.setTimeTableEntryStatus(DateTime.fromISO('2023-09-17T14:20:00.000+02:00'), false)

    expect(schedule.getNextGong()?.time).toEqual(DateTime.fromISO('2023-09-17T19:20:00.000+02:00'))
})

test('Restore disabled entries on start', () => {
    let date = DateTime.fromISO('2023-09-17T12:00:00');
    jest.setSystemTime(date.toJSDate());

    schedule = new Schedule(parseSchedule(data))

    expect(schedule.getNextGong()?.time).toEqual(DateTime.fromISO('2023-09-17T14:20:00.000+02:00'))

    let disabledEntries = new DisabledEntries([DateTime.fromISO('2023-09-17T14:20:00.000+02:00')])

    schedule = new Schedule(parseSchedule(data), disabledEntries)

    expect(schedule.disabledEntries?.entries.length).toEqual(1)

    expect(schedule.disabledEntries?.entries[0]).toEqual(DateTime.fromISO('2023-09-17T14:20:00.000+02:00'))

    expect(schedule.disabledEntries?.entries.some(e => e.equals(DateTime.fromISO('2023-09-17T14:20:00.000+02:00')))).toBeTruthy()

    expect(schedule.getNextGong()?.time).toEqual(DateTime.fromISO('2023-09-17T19:20:00.000+02:00'))
})
