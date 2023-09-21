const fs = require('fs');
import path from 'path';

import { DateTime } from 'luxon'

import fetch from 'node-fetch-cache';

import { Course } from './models'

const daysBefore = 14
const daysAfter = 15

function getCacheFilePath() {
    if (fs.existsSync('/data'))
        return '/data/schedule.json'
    else
        return './schedule.json'
}

/**
 * Format date range for use in fetch call based on current date
 * plus and minus a set of days defined above
 * @returns string in format past+-+future
 */
function getDateRange() {
    let past = DateTime.now().minus({ days: daysBefore }).toISODate()
    let future = DateTime.now().plus({ days: daysAfter }).toISODate()

    return `${past}+-+${future}`
}

/**
 * Fetch schedule for daterange and a location from dhamma.org site
 * @param locationId to get courses for
 * @returns json response
 */
async function fetchCourses(locationId:number) {
    let daterange = getDateRange()

    let body = `regions[]=location_${locationId}&daterange=${daterange}&page=1`

    const response = await fetch('https://www.dhamma.org/en/courses/do_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        'body': body
    });
    
    let data = await response.json();
    return data
}

/**
 * Get course type, start and end of courses
 * @param data that was fetched in json format
 * @returns array of Course
 */
function parseCourses(data: any): Array<Course> {
    let courses: Array<Course> = []
    for (let course of data['courses']) {
        courses.push(new Course(course['raw_course_type'], course['course_start_date'], course['course_end_date']))
    }

    return courses
}

/**
 * Read file with static data and parse
 * @returns array of Course
 */
function fakeFetchCourses() {
    console.log('[automation] Using fake course data')
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../tests/resources/schedule.json')));
}

/**
 * Fetch courses form remote and save to cache.
 * @param locationId to get courses for
 * @param fake optional to use local test data
 * @returns json or undefined
 */
async function fetchAndPersist(locationId:number, fake:boolean = false) {
    let courses:any = {}

    try {
        courses = fake === true ? fakeFetchCourses() : await fetchCourses(locationId)
    } catch {
        console.log('[automation] Failed to fetch schedule')
    }

    if (('total_rows' in courses && courses.total_rows > 0) && (courses.courses[0].location.id == locationId)) {
        console.log(`[automation] Writing schedule to disk cache, ${getCacheFilePath()}`)
        fs.writeFileSync(getCacheFilePath(), JSON.stringify(courses));
        return courses
    }

    return undefined
}

/**
 * Reads schedule from file if it exits
 * @returns json or undefined
 */
function fetchFromCache() {
    if (fs.existsSync(getCacheFilePath())) {
        console.log(`[automation] Reading schedule from disk cache, ${getCacheFilePath()}`)
        return JSON.parse(fs.readFileSync(getCacheFilePath()))
    }

    return undefined
}

export {
    fetchCourses,
    fakeFetchCourses,
    getDateRange,
    parseCourses,
    fetchAndPersist,
    fetchFromCache
}