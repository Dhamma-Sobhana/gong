const fs = require('fs');
import path from 'path';
import { DateTime, Interval } from 'luxon'

import fetch from 'node-fetch-cache';

import { parseJson } from './lib';
import { Course, TimeTable, TimeTableEntry } from './models'

const location = 'location_1392'
const daysBefore = 14
const daysAfter = 15

function getDateRange() {
    let past = DateTime.now().minus({days: daysBefore}).toISODate()
    let future = DateTime.now().plus({days: daysAfter}).toISODate()

    return `${past}+-+${future}`
}

async function fetchCourses() {
    let daterange = getDateRange()

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

function getTimeTableJson(courseType?:string):any {
    let fileName

    if (courseType === undefined)
        fileName = 'default'
    else if (!timeTableExists(courseType))
        fileName = 'unknown'
    else
        fileName = courseType
    
    return parseJson(fs.readFileSync(path.resolve(__dirname, `../resources/timetable/${fileName}.json`)));
}

function getTimeTable(courseType:string, courseDay?:number):TimeTable {
    let data = getTimeTableJson(courseType)
    let timeTable = new TimeTable(data['definition']['type'])

    if (data.definition.endTime)
        timeTable.setEndTime(data.definition.endTime)

    if (data.days) {
        if (timeTable.type === 'static') {
            for (let entry of data.days.all) {
                timeTable.entries.push(new TimeTableEntry(DateTime.now(), entry['time'], entry['type'], entry['location']))
            }
        } else if (timeTable.type === 'dynamic') {
            for (let entry of data.days[`${courseDay}`]) {
                timeTable.entries.push(new TimeTableEntry(DateTime.now(), entry['time'], entry['type'], entry['location']))
            }
        }
    }

    return timeTable
}

function getCoursesByDate(allCourses:Array<Course>, date:DateTime):Array<Course> {
    let courses:Array<Course> = []
    for (let course of allCourses) {
        if ((course['start'] <= date) && (course['end'] >= date))
            courses.push(course)
    }

    if (courses.length === 0) {
        let today = date.toISODate()
        // @ts-ignore: Object is possibly 'null'.
        courses.push(new Course('default', today, today))
    }
    
    return courses
}

function getCourseDayByDate(course:Course, date:DateTime) {
    let interval = Interval.fromDateTimes(course.start, date)
    return Math.floor(interval.length('days')) 
}

function getNextGong(timeTable?:TimeTable):TimeTableEntry|undefined {
    if (timeTable === undefined)
        return undefined

    for (let entry of timeTable.entries) {
        if (entry['time'] > DateTime.now())
            return entry
    }
    
    return undefined
}


function getGongSchedule(courses:Array<Course>):Array<TimeTableEntry> {
    let today = getCoursesByDate(courses, DateTime.now())

    let timeTable:Array<TimeTableEntry> = []

    for (let course of courses) {
        // @ts-ignore: Object is possibly 'null'.
        timeTable.push(getTimeTable(DateTime.now(), course.type))
    }
    
    return timeTable
}

/**
 * 
 * @param timeTables Only handles 2 timeTables
 * @returns 
 */
function mergeSchedules(timeTables:Array<TimeTable>):TimeTable {
    if (timeTables.length == 1)
        return timeTables[0]
     
    let result = new TimeTable('mixed')
    result.entries = timeTables[0].entries 

    for (let timeTableEntry of timeTables[1].entries) {
        if (timeTables[0].endTime === undefined)
            result.entries.push(timeTableEntry)
        else if (timeTableEntry.time > timeTables[0].endTime)
            result.entries.push(timeTableEntry)
    }

    return result
}

function getSchedule(allCourses:Array<Course>, date:DateTime):TimeTable {
    let courses = getCoursesByDate(allCourses, date)

    let timeTables:Array<TimeTable> = []
    for (let course of courses) {
        timeTables.push(getTimeTable(course.type, getCourseDayByDate(course, date)))
    }

    return mergeSchedules(timeTables)
}

export { fetchCourses, getDateRange, parseCourses, timeTableExists, getTimeTableJson, getTimeTable, getCoursesByDate, getCourseDayByDate, getNextGong, getGongSchedule, mergeSchedules, getSchedule }