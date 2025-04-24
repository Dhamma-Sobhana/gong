const fs = require('fs');
import path from 'path';

import { DateTime, Interval } from 'luxon';

import { timeTableExists, getTimeTableJson, getTimeTable, getCourseDayByDate, getCoursesByDate, mergeSchedules, Schedule, filterCoursesByPriority } from '../src/schedule';
import { Course, DisabledEntries, TimeTable } from '../src/models';
import { parseSchedule } from '../src/fetch';

let data:any
let schedule:Schedule

const REPEAT_COUNT = 4

beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2023, 8, 15, 12))
    data = JSON.parse(fs.readFileSync(path.resolve(__dirname, './resources/schedule.json')));
    schedule = new Schedule(parseSchedule(data), REPEAT_COUNT)
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
    expect(getTimeTableJson('10-Day').days[11].length).toBe(3);
});

test('Get TimeTable', () => {
    let date = DateTime.fromISO('2023-09-15');
    expect(getTimeTable('UnknownType', date, 0, REPEAT_COUNT).entries.length).toBe(0);

    let timeTable = getTimeTable('ServicePeriod', date, 1, REPEAT_COUNT);

    expect(timeTable.courseType).toBe('ServicePeriod')

    expect(timeTable.entries.length).toBe(3);
    let entry = timeTable.entries[0];
    expect(entry.time.day).toBe(15);
    expect(entry.time.hour).toBe(7);
    expect(entry.time.minute).toBe(20);
    expect(entry.time.second).toBe(0);
    expect(entry.type).toBe('gong');
    expect(entry.locations).toStrictEqual(['all']);

    expect(getTimeTable('10-Day', date, 11, REPEAT_COUNT).entries.length).toBe(3);
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

    let timeTable = getTimeTable('10-Day', date, getCourseDayByDate(course, date), REPEAT_COUNT)

    expect(timeTable).toBeDefined()
    expect(timeTable.entries.length).toBe(2)

    date = DateTime.fromISO('2023-09-08T00:00:00');
    expect(getCourseDayByDate(course, date)).toBe(2)

    timeTable = getTimeTable('10-Day', date, getCourseDayByDate(course, date), REPEAT_COUNT)

    expect(timeTable).toBeDefined()
    expect(timeTable.entries[4].time.hour).toBe(14)
    expect(timeTable.entries[4].time.minute).toBe(15)

    date = DateTime.fromISO('2023-09-10T00:00:00');
    expect(getCourseDayByDate(course, date)).toBe(4)

    timeTable = getTimeTable('10-Day', date, getCourseDayByDate(course, date), REPEAT_COUNT)

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
        timeTables.push(getTimeTable(course.type, date, getCourseDayByDate(course, date), REPEAT_COUNT));
    }
    expect(timeTables.length).toBe(2);
    expect(timeTables[0].entries.length).toBe(3);
    expect(timeTables[1].entries.length).toBe(3);

    let result = mergeSchedules(timeTables);

    expect(result.entries.length).toBe(5);
    expect(result.entries[1].time.hour).toBe(4);
    expect(result.entries[1].time.minute).toBe(20);
    expect(result.entries[2].time.hour).toBe(8);
    expect(result.entries[2].time.minute).toBe(50);
    expect(result.entries[3].time.hour).toBe(14);
    expect(result.entries[3].time.minute).toBe(20);
    expect(result.entries[4].time.hour).toBe(19);
    expect(result.entries[4].time.minute).toBe(20);
});

test('Get Schedule', () => {
    let date = DateTime.fromISO('2023-09-17T12:00:00');
    jest.setSystemTime(date.toJSDate());

    let _schedule = schedule.getScheduleByDate(date);

    expect(_schedule.courseType).toBe('mixed');
    expect(_schedule.entries.length).toBe(5);
    expect(_schedule.entries[1].time.hour).toBe(4);
    expect(_schedule.entries[1].time.minute).toBe(20);
    expect(_schedule.entries[3].time.hour).toBe(14);
    expect(_schedule.entries[3].time.minute).toBe(20);
});

test('Get schedule between 10 day course and Trust Weekend', () => {
    let tenDay = new Course('10-Day', '2025-02-04', '2025-02-15', DateTime.fromISO("09:00"))
    let trust = new Course('OSProgram', '2025-02-15', '2025-02-16')
    
    let sched = new Schedule([tenDay, trust], REPEAT_COUNT)

    let today = sched.getScheduleByDate(DateTime.fromISO('2025-02-15T12:00:00'));

    expect(today.entries.length).toBe(5)

    expect(today.entries[0].time.hour).toBe(4)
    expect(today.entries[0].time.minute).toBe(0)
    expect(today.entries[3].time.hour).toBe(13)
    expect(today.entries[3].time.minute).toBe(50)
})

test('Get schedule between 10 day course and unknown period', () => {
    let tenDay = new Course('10-Day', '2025-02-04', '2025-02-15', DateTime.fromISO("09:00"))
    let unknown = new Course('Child', '2025-02-15', '2025-02-16')
    
    let sched = new Schedule([tenDay, unknown], REPEAT_COUNT)

    let today = sched.getScheduleByDate(DateTime.fromISO('2025-02-15T12:00:00'));
    expect(today.entries.length).toBe(3)
    expect(today.entries[0].time.hour).toBe(4)
    expect(today.entries[0].time.minute).toBe(0)
})

test('Get Gong Schedule for today and tomorrow', () => {
    let today = schedule.getScheduleByDate(DateTime.fromISO('2023-09-17T12:00:00'));
    expect(today.entries.length).toBe(5);

    let tomorrow = schedule.getScheduleByDate(DateTime.fromISO('2023-09-18T12:00:00'));
    expect(tomorrow.entries.length).toBe(3);
});

test('Get Gong Schedule for today and tomorrow for end of 10 day course', () => {
    //let date = DateTime.fromISO('2025-02-14T12:00:00');
    //jest.setSystemTime(date.toJSDate());
    jest.setSystemTime(new Date(2025, 1, 14, 12))

    // Day 10: 5
    // Day 11: 2 + 3 - 1 First gong of service period removed due to being before end-time of 10 day course
    let tenDay = new Course('10-Day', '2025-02-04', '2025-02-15', DateTime.fromISO("09:00")) 
    let servicePeriod = new Course('ServicePeriod', '2025-02-15', '2025-02-16')

    let sched = new Schedule([tenDay, servicePeriod], REPEAT_COUNT)
    let schedule = sched.getSchedule()

    expect(schedule.entries.length).toBe(12)
    expect(schedule.entries[0].time.hour).toBe(4)
    expect(schedule.entries[0].time.minute).toBe(0)

    expect(schedule.entries[6].time.hour).toBe(19)
    expect(schedule.entries[6].time.minute).toBe(10)

    expect(schedule.entries[8].time.hour).toBe(4)
    expect(schedule.entries[8].time.minute).toBe(20)

    expect(schedule.entries[10].time.hour).toBe(14)
    expect(schedule.entries[10].time.minute).toBe(20)
})



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
    expect(time_table.entries.length).toBe(8);

    let entry = time_table.entries[0]
    expect(entry.time).toEqual(DateTime.fromISO('2023-09-17T04:00:00.000+02:00'))

    expect(schedule.getNextGong()?.time).toEqual(DateTime.fromISO('2023-09-17T14:20:00.000+02:00'))

    schedule.setTimeTableEntryStatus(DateTime.fromISO('2023-09-17T14:20:00.000+02:00'), false)

    expect(schedule.getNextGong()?.time).toEqual(DateTime.fromISO('2023-09-17T19:20:00.000+02:00'))
})

test('Restore disabled entries on start', () => {
    let date = DateTime.fromISO('2023-09-17T12:00:00');
    jest.setSystemTime(date.toJSDate());

    schedule = new Schedule(parseSchedule(data), REPEAT_COUNT)

    expect(schedule.getNextGong()?.time).toEqual(DateTime.fromISO('2023-09-17T14:20:00.000+02:00'))

    let disabledEntries = new DisabledEntries([DateTime.fromISO('2023-09-17T14:20:00.000+02:00')])

    schedule = new Schedule(parseSchedule(data), REPEAT_COUNT, disabledEntries)

    expect(schedule.disabledEntries?.entries.length).toEqual(1)

    expect(schedule.disabledEntries?.entries[0]).toEqual(DateTime.fromISO('2023-09-17T14:20:00.000+02:00'))

    expect(schedule.disabledEntries?.entries.some(e => e.equals(DateTime.fromISO('2023-09-17T14:20:00.000+02:00')))).toBeTruthy()

    expect(schedule.getNextGong()?.time).toEqual(DateTime.fromISO('2023-09-17T19:20:00.000+02:00'))
})

test('Filter courses happening on the same day, based on starting day and length', () => {
    let date = DateTime.fromISO('2025-03-21T12:00:00')

    let servicePeriod = new Course('ServicePeriod', '2025-03-16', '2025-03-26')
    let child = new Course('Child', '2025-03-21', '2025-03-23')

    let result = filterCoursesByPriority([servicePeriod, child], date)
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('Child')
})

test('Handle course happening during service period', () => {
    //let date = DateTime.fromISO('2025-02-14T12:00:00');
    //jest.setSystemTime(date.toJSDate());

    let servicePeriod = new Course('ServicePeriod', '2025-03-16', '2025-03-26')
    let child = new Course('Child', '2025-03-21', '2025-03-23')

    let sched = new Schedule([servicePeriod, child], REPEAT_COUNT)

    let by_date = sched.getScheduleByDate(DateTime.fromISO('2025-03-20T12:00:00'))
    expect(by_date.entries.length).toBe(3)

    by_date = sched.getScheduleByDate(DateTime.fromISO('2025-03-21T12:00:00'))
    expect(by_date.entries.length).toBe(0)

    jest.setSystemTime(DateTime.fromISO('2025-03-20T12:00:00').toJSDate())

    let schedule = sched.getSchedule()

    expect(schedule.entries.length).toBe(3)
    expect(schedule.entries[0].time.hour).toBe(7)
    expect(schedule.entries[0].time.minute).toBe(20)

    jest.setSystemTime(DateTime.fromISO('2025-03-21T12:00:00').toJSDate())

    schedule = sched.getSchedule()

    expect(schedule.entries.length).toBe(0)

    // expect(schedule.entries[0].time.hour).toBe(4)
    // expect(schedule.entries[0].time.minute).toBe(20)
})


test('Unknown course ends during service period', () => {
    let servicePeriod = new Course('ServicePeriod', '2025-03-16', '2025-03-26')
    let notDefined = new Course('NotDefined', '2025-03-21', '2025-03-23')

    let sched = new Schedule([servicePeriod, notDefined], REPEAT_COUNT)

    let by_date = sched.getScheduleByDate(DateTime.fromISO('2025-03-20T12:00:00'))
    expect(by_date.entries.length).toBe(3)

    by_date = sched.getScheduleByDate(DateTime.fromISO('2025-03-21T12:00:00'))
    expect(by_date.entries.length).toBe(0)

    by_date = sched.getScheduleByDate(DateTime.fromISO('2025-03-23T12:00:00'))
    expect(by_date.entries.length).toBe(3)
})


test('10 day course ends, Service Period and Trust Meeting starting', () => {
    jest.setSystemTime(DateTime.fromISO('2025-03-20T12:00:00').toJSDate())

    let tenDay = new Course('10-Day', '2025-02-04', '2025-02-15', DateTime.fromISO("09:00"))
    let trust = new Course('OSProgram', '2025-02-15', '2025-02-16')
    let servicePeriod = new Course('ServicePeriod', '2025-02-15', '2025-02-20')

    let sched = new Schedule([tenDay, trust, servicePeriod], REPEAT_COUNT)

    let schedule = sched.getScheduleByDate(DateTime.fromISO('2025-02-15T12:00:00'))
    
    expect(schedule.entries.length).toBe(5)
    expect(schedule.entries[2].time.hour).toBe(8)
    expect(schedule.entries[2].time.minute).toBe(50)
    expect(schedule.entries[3].time.hour).toBe(13)
    expect(schedule.entries[3].time.minute).toBe(50)
    expect(schedule.entries[4].time.hour).toBe(17)
    expect(schedule.entries[4].time.minute).toBe(50)

    schedule = sched.getScheduleByDate(DateTime.fromISO('2025-02-16T12:00:00'))
    expect(schedule.entries.length).toBe(3)

    expect(schedule.entries[0].time.hour).toBe(7)
    expect(schedule.entries[0].time.minute).toBe(20)
    expect(schedule.entries[1].time.hour).toBe(14)
    expect(schedule.entries[1].time.minute).toBe(20)
    expect(schedule.entries[2].time.hour).toBe(19)
    expect(schedule.entries[2].time.minute).toBe(20)
})

test('10 day course ends, Service Period and Trust Meeting starting, reverse order', () => {
    jest.setSystemTime(DateTime.fromISO('2025-03-20T12:00:00').toJSDate())

    let tenDay = new Course('10-Day', '2025-02-04', '2025-02-15', DateTime.fromISO("09:00"))
    let trust = new Course('OSProgram', '2025-02-15', '2025-02-16')
    let servicePeriod = new Course('ServicePeriod', '2025-02-15', '2025-02-20')

    let sched = new Schedule([tenDay, servicePeriod, trust], REPEAT_COUNT)

    let schedule = sched.getScheduleByDate(DateTime.fromISO('2025-02-15T12:00:00'))
    
    expect(schedule.entries.length).toBe(5)
    expect(schedule.entries[2].time.hour).toBe(8)
    expect(schedule.entries[2].time.minute).toBe(50)
    expect(schedule.entries[3].time.hour).toBe(13)
    expect(schedule.entries[3].time.minute).toBe(50)
    expect(schedule.entries[4].time.hour).toBe(17)
    expect(schedule.entries[4].time.minute).toBe(50)

    expect(sched.getScheduleByDate(DateTime.fromISO('2025-02-16T12:00:00')).entries.length).toBe(3)
})

test('Service Period ends and 10 day course starts', () => {
    let servicePeriod = new Course('ServicePeriod', '2025-03-30', '2025-04-01')
    let tenDay = new Course('10-Day', '2025-04-01', '2025-04-12', DateTime.fromISO("09:00"))

    let sched = new Schedule([servicePeriod, tenDay], REPEAT_COUNT)

    let schedule = sched.getScheduleByDate(DateTime.fromISO('2025-04-01T12:00:00'))
    
    expect(schedule.entries.length).toBe(2)
    expect(schedule.entries[0].time.hour).toBe(7)
    expect(schedule.entries[0].time.minute).toBe(20)
    expect(schedule.entries[1].time.hour).toBe(12)
    expect(schedule.entries[1].time.minute).toBe(50)
})

test('Open house schedule', () => {
    let threeDay = new Course('3-DayOSC', '2025-09-10', '2025-09-14', DateTime.fromISO("09:00"))
    let openHouse = new Course('OpenHouse', '2025-09-14', '2025-09-14')
    let servicePeriod = new Course('ServicePeriod', '2025-09-14', '2025-09-19')

    let sched = new Schedule([threeDay, openHouse, servicePeriod], REPEAT_COUNT)

    let schedule = sched.getScheduleByDate(DateTime.fromISO('2025-09-14T12:00:00'))

    expect(schedule.entries.length).toBe(4)
    expect(schedule.entries[2].time.hour).toBe(8)
    expect(schedule.entries[2].time.minute).toBe(50)
    expect(schedule.entries[3].time.hour).toBe(19)
    expect(schedule.entries[3].time.minute).toBe(20)
})

test('Sort courses by length', () => {
    let trust = new Course('OSProgram', '2025-02-15', '2025-02-16')
    let servicePeriod = new Course('ServicePeriod', '2025-02-15', '2025-02-20')

    let allCourses = [servicePeriod, trust]
    
    allCourses.sort((a, b) => Interval.fromDateTimes(a.start, a.end).length("days") - Interval.fromDateTimes(b.start, b.end).length("days"));

    expect(allCourses[0].type).toBe('OSProgram')
})

test('Custom repeat for morning gong', () => {
    let course = new Course('10-Day', '2025-02-04', '2025-02-15', DateTime.fromISO("09:00"))
    let sched = new Schedule([course], 4)

    let schedule = sched.getScheduleByDate(DateTime.fromISO('2025-02-10T12:00:00'))
    expect(schedule.entries[0].time.hour).toBe(4)
    expect(schedule.entries[0].time.minute).toBe(0)
    expect(schedule.entries[0].repeat).toBe(8)

    expect(schedule.entries[2].time.hour).toBe(7)
    expect(schedule.entries[2].time.minute).toBe(48)
    expect(schedule.entries[2].repeat).toBe(4)

    course = new Course('Satipatthana', '2025-02-04', '2025-02-15', DateTime.fromISO("09:00"))
    sched = new Schedule([course], 6)

    schedule = sched.getScheduleByDate(DateTime.fromISO('2025-02-05T12:00:00'))

    expect(schedule.entries[0].time.hour).toBe(4)
    expect(schedule.entries[0].time.minute).toBe(0)
    expect(schedule.entries[0].repeat).toBe(8)

    expect(schedule.entries[2].time.hour).toBe(7)
    expect(schedule.entries[2].time.minute).toBe(48)
    expect(schedule.entries[2].repeat).toBe(6)

    course = new Course('3-DayOSC', '2025-02-04', '2025-02-07', DateTime.fromISO("09:00"))
    sched = new Schedule([course], 4)

    schedule = sched.getScheduleByDate(DateTime.fromISO('2025-02-05T12:00:00'))

    expect(schedule.entries[0].time.hour).toBe(4)
    expect(schedule.entries[0].time.minute).toBe(0)
    expect(schedule.entries[0].repeat).toBe(8)
})

