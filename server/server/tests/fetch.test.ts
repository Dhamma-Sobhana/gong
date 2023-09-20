const fs = require('fs');
import path from 'path';

import { DateTime } from 'luxon';

import { fetchCourses, parseCourses, getDateRange } from '../src/fetch'
import { Course } from '../src/models'

let data:any
let allCourses:Array<Course>

beforeAll(() => {
    jest.useFakeTimers()
    data = JSON.parse(fs.readFileSync(path.resolve(__dirname, './resources/schedule.json')));
    allCourses = parseCourses(data)
})

test.skip('Fetch schedule', async () => {
    let result = await fetchCourses(1392)

    expect(result).toBeDefined()
})

test('Get date range', () => {
    jest.setSystemTime(DateTime.fromISO('2023-09-15T12:00:00').toJSDate())
    
    let result = getDateRange()

    expect(result).toBe('2023-09-01+-+2023-09-30')
})

test('Parse courses', () => {
    let result:Array<Course> = parseCourses(data)

    expect(result).toBeDefined()
    expect(result.length).toBe(6)
    expect(result[0]['type']).toBe('Child')
    expect(result[0]['start'].toISODate()).toBe('2023-08-25')
    expect(result[0]['end'].toISODate()).toBe('2023-08-27')
})