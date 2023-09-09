const fs = require('fs');
import path from 'path';

import { fetchCourses, parseCourses, getDateRange, timeTableExists, readTimeTable } from '../src/fetch'
import { Course } from '../src/models'

// test('Fetch schedule', async () => {
//     let result = await fetchSchedule()

//     expect(result).toBeDefined()
// })

test('Get date range', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date(2023, 8, 15, 12))
    
    let result = getDateRange()

    expect(result).toBe('2023-09-01+-+2023-09-30')
})

test('Parse courses', () => {
    let courses = JSON.parse(fs.readFileSync(path.resolve(__dirname, './resources/schedule.json')));
    
    expect(courses['courses'].length).toBe(6)

    let result:Array<Course> = parseCourses(courses)

    expect(result).toBeDefined()
    expect(result.length).toBe(6)
    expect(result[0]['type']).toBe('Child')
    expect(result[0]['start']).toBe('2023-08-25')
    expect(result[0]['end']).toBe('2023-08-27')
})

test('Time table exists', () => {
    expect(timeTableExists('ServicePeriod')).toBe(true)

    expect(timeTableExists('UnknownType')).toBe(false)
})

test('Read schedule', () => {
    expect(readTimeTable('UnknownType')).toBeUndefined()

    let schedule = readTimeTable('ServicePeriod')
    expect(schedule).toBeDefined()
    if (schedule) {
        expect(schedule.length).toBe(3)
        expect(schedule[0]['time']).toBe('07:20')
        expect(schedule[0]['type']).toBe('gong')
        expect(schedule[0]['location']).toStrictEqual(['all'])
    }
})
