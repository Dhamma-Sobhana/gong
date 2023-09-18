const fs = require('fs');
import path from 'path';

import { DateTime } from 'luxon'

import fetch from 'node-fetch-cache';

import { Course } from './models'

const location = 'location_1392'
const daysBefore = 14
const daysAfter = 15

function getDateRange() {
    let past = DateTime.now().minus({ days: daysBefore }).toISODate()
    let future = DateTime.now().plus({ days: daysAfter }).toISODate()

    return `${past}+-+${future}`
}

async function fetchCourses() {
    let daterange = getDateRange()

    const params = new URLSearchParams();
    let body = `regions[]=${location}&daterange=${daterange}&page=1`

    const response = await fetch('https://www.dhamma.org/en/courses/do_search', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 'body': body });
    const data = await response.json();

    return data
}

function parseCourses(data: any): Array<Course> {
    let courses: Array<Course> = []
    for (let course of data['courses']) {
        courses.push(new Course(course['raw_course_type'], course['course_start_date'], course['course_end_date']))
    }

    return courses
}

function fakeFetchAndParseCourses() {
    let data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../tests/resources/schedule.json')));
    return parseCourses(data)
}

export {
    fetchCourses,
    getDateRange,
    parseCourses,
    fakeFetchAndParseCourses
}