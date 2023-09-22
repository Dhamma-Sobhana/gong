const fs = require('fs');
import path from 'path';

import { DateTime } from 'luxon';

import { timeTableExists, getTimeTableJson, getTimeTable, getCoursesByDate, getCourseDayByDate, getNextGong, mergeSchedules, getSchedule } from '../src/schedule';
import { Course, TimeTable } from '../src/models';
import { parseSchedule } from '../src/fetch';

let data:any
let allCourses:Array<Course>

beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2023, 8, 15, 12))
    data = JSON.parse(fs.readFileSync(path.resolve(__dirname, './resources/schedule.json')));
    allCourses = parseSchedule(data)
})

test('Time table exists', () => {
    expect(timeTableExists('ServicePeriod')).toBe(true);
    expect(timeTableExists('10-Day')).toBe(true);
    expect(timeTableExists('UnknownType')).toBe(false);
});

test('Get TimeTable Json', () => {
    expect(getTimeTableJson('unknown').days.all.length).toBe(0);
    expect(getTimeTableJson(undefined).days.all.length).toBe(3);
    expect(getTimeTableJson('ServicePeriod').days.all.length).toBe(3);
    expect(getTimeTableJson('10-Day').days[11].length).toBe(2);
});

test('Get TimeTable', () => {
    let date = DateTime.fromISO('2023-09-15');
    expect(getTimeTable('UnknownType', date, 0).entries.length).toBe(0);

    let timeTable = getTimeTable('ServicePeriod', date, 1);

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
    let result = getCoursesByDate(allCourses, today);
    expect(result).toBeDefined();

    expect(result.length).toBe(1);
    expect(result[0]['start'].toISODate()).toBe('2023-08-30');
    expect(result[0]['type']).toBe('3-DayOSC');

    today = DateTime.fromObject({ year: 2023, month: 9, day: 18, hour: 12 });
    result = getCoursesByDate(allCourses, today);

    if (result) {
        expect(result[0]['type']).toBe('ServicePeriod');
    }
});

test('Get default when no ongoing course', () => {
    let today = DateTime.fromObject({ year: 2023, month: 8, day: 29, hour: 12 });
    let result = getCoursesByDate(allCourses, today);

    expect(result.length).toBe(1);
    expect(result[0].type).toBe('default');
});

test('Get day with multiple courses', () => {
    let today = DateTime.fromObject({ year: 2023, month: 9, day: 17, hour: 12 });
    let result = getCoursesByDate(allCourses, today);

    expect(result.length).toBe(2);
    expect(result[0].type).toBe('10-Day');
    expect(result[1].type).toBe('ServicePeriod');
});

test('Get course day by date', () => {
    let date = DateTime.fromISO('2023-09-17T00:00:00');
    let result = getCourseDayByDate(allCourses[4], date);

    expect(result).toBe(11);

    date = DateTime.fromISO('2023-09-12T23:59:59');
    result = getCourseDayByDate(allCourses[4], date);

    expect(result).toBe(6);

    date = DateTime.fromISO('2023-09-06T23:59:59');
    result = getCourseDayByDate(allCourses[4], date);

    expect(result).toBe(0);
});

test('Merge schedules', () => {
    let date = DateTime.fromISO('2023-09-17T12:00:00');
    let courses = getCoursesByDate(allCourses, date);
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
    expect(result.entries[1].time.minute).toBe(25);
    expect(result.entries[2].time.hour).toBe(14);
    expect(result.entries[2].time.minute).toBe(20);
});

test('Get Schedule', () => {
    let date = DateTime.fromISO('2023-09-17T12:00:00');
    jest.setSystemTime(date.toJSDate());

    let schedule = getSchedule(allCourses, date);

    expect(schedule.type).toBe('mixed');
    expect(schedule.entries.length).toBe(4);
    expect(schedule.entries[1].time.hour).toBe(4);
    expect(schedule.entries[1].time.minute).toBe(25);
    expect(schedule.entries[2].time.hour).toBe(14);
    expect(schedule.entries[2].time.minute).toBe(20);
});

test('Get Gong Schedule for today and tomorrow', () => {
    let today = getSchedule(allCourses, DateTime.fromISO('2023-09-17T12:00:00'));
    expect(today.entries.length).toBe(4);

    let tomorrow = getSchedule(allCourses, DateTime.fromISO('2023-09-18T12:00:00'));
    expect(tomorrow.entries.length).toBe(3);
});

test('Get next gong', () => {
    jest.setSystemTime(DateTime.fromISO('2023-09-17T03:00:15').toJSDate());

     
    let result = getNextGong(allCourses);


    expect(result).toBeDefined();
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].hour).toBe(4);
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].minute).toBe(10);
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].second).toBe(0);

    jest.setSystemTime(DateTime.fromISO('2023-09-17T12:00:00').toJSDate());

    result = getNextGong(allCourses)

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

    result = getNextGong(allCourses);

    // @ts-ignore
    expect(result['time'].day).toBe(18)
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].hour).toBe(7);
    // @ts-ignore Object is possibly 'undefined'.ts(2532)'
    expect(result['time'].minute).toBe(20);
});