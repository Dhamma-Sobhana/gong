const fs = require('fs');
import path from 'path';

import fetch from 'node-fetch-cache';

import { parseJson } from './lib';
import { Course, TimeTable } from './models'

const location = 'location_1392'
const daysBefore = 14
const daysAfter = 15

function getDateRange() {
    var date = new Date();
    date.setDate(date.getDate() - daysBefore);
    let past = date.toISOString().substring(0, 10)

    date.setDate(date.getDate() + daysBefore + daysAfter)
    let future = date.toISOString().substring(0, 10)

    return `${past}+-+${future}`
}

async function fetchCourses() {
    let daterange = getDateRange()

    console.log(daterange)

    const params = new URLSearchParams();
    let body = `regions[]=${location}&daterange=${daterange}&page=1`

    const response = await fetch('https://www.dhamma.org/en/courses/do_search', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'} , 'body': body});
    const data = await response.json();

    return data
}

function parseCourses(data:any):Array<Course> {
    let courses:Array<Course> = []
    for (let course of data['courses']) {
        courses.push(new Course(course['raw_course_type'], course['course_start_date'], course['course_end_date']))
    }
    
    return courses
}

function timeTableExists(courseType:string):boolean {
    return fs.existsSync(path.resolve(__dirname, `../resources/timetable/${courseType}.json`))
}

function readTimeTable(courseType:string):Array<TimeTable>|undefined {
    if (!timeTableExists(courseType)) {
        return undefined
    }

    let result = parseJson(fs.readFileSync(path.resolve(__dirname, `../resources/timetable/${courseType}.json`)));

    let timeTable = []
    if (result['definition']['type'] === 'static') {
        for (let entry of result['days']['all']) {
            timeTable.push(new TimeTable(entry['time'], entry['type'], entry['location']))
        }
    }

    return timeTable
}

export { fetchCourses, getDateRange, parseCourses, timeTableExists, readTimeTable }