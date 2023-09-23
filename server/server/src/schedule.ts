const fs = require("fs");
import path from "path";
import { DateTime, Interval } from "luxon";
import { parseJson } from "./lib";
import { Course, TimeTable, TimeTableEntry } from "./models";

/**
 * Check if a time table definition exits
 * @param courseType base filename
 * @returns true if found
 */
function timeTableExists(courseType: string): boolean {
    return fs.existsSync(
        path.resolve(__dirname, `../resources/timetable/${courseType}.json`)
    );
}

/**
 * Get file content for course type. If coursteType is undefined, return file default.json
 * If requested courste type is not found, return unknown.json
 * @param courseType optinal base filename
 * @returns file content
 */
function getTimeTableJson(courseType?: string): any {
    let fileName;

    if (courseType === undefined) fileName = "default";
    else if (!timeTableExists(courseType)) fileName = "unknown";
    else fileName = courseType;

    return parseJson(
        fs.readFileSync(
            path.resolve(__dirname, `../resources/timetable/${fileName}.json`)
        )
    );
}

/**
 * Read TimeTable definition from file and return timetable for supplied date
 * @param courseType base file name
 * @param date to get course for, used for instansiating time properties
 * @param courseDay optional if multiday course, to find file content for that day
 * @returns a timetable with with time table entries
 */
function getTimeTable(courseType: string, date: DateTime, courseDay?: number): TimeTable {
    let data = getTimeTableJson(courseType);
    let timeTable = new TimeTable(courseType);

    if (data.definition?.endTime) timeTable.setEndTime(data.definition.endTime);

    if (data.days) {
        let index

        if (`${courseDay}` in data.days)
            index = `${courseDay}`
        else if ('default' in data.days)
            index = 'default'

        if (index) {
            for (let entry of data.days[index]) {
                timeTable.entries.push(
                    new TimeTableEntry(
                        date,
                        entry["time"],
                        entry["type"],
                        entry["location"],
                        timeTable.courseType
                    )
                );
            }
        }
    }

    return timeTable;
}

/**
 * Find all courses that are active on one day. Usully returns one but can 
 * return two when one course end and another starts on the same date
 * @param allCourses array of fetched courses
 * @param date to get courses for
 * @returns array of 1 or 2 courses
 */
function getCoursesByDate(allCourses: Array<Course>, date: DateTime): Array<Course> {
    let courses: Array<Course> = [];
    
    for (let course of allCourses) {
        if (course["start"] <= date && course["end"] >= date) courses.push(course);
    }

    if (courses.length === 0) {
        let today = date.toISODate();
        // @ts-ignore: Object is possibly 'null'.
        courses.push(new Course("default", today, today));
    }

    return courses;
}

/**
 * Get course day from the current date, starting from 0
 * @param course the check
 * @param date to get day for
 * @returns days since the course started
 */
function getCourseDayByDate(course: Course, date: DateTime) {
    let interval = Interval.fromDateTimes(course.start, date);
    return Math.floor(interval.length("days"));
}

/**
 * Merge two TimeTables. If first one has endTime defined, entries from
 * seconds TimeTable will be ignored before that time.
 * @param timeTables 1 or 2 TimeTable
 * @returns a new TimeTable without overlapping entries
 */
function mergeSchedules(timeTables: Array<TimeTable>): TimeTable {
    if (timeTables.length == 1) return timeTables[0];

    let result = new TimeTable("mixed");
    result.entries = timeTables[0].entries;

    for (let timeTableEntry of timeTables[1].entries) {
        if (timeTables[0].endTime === undefined)
            result.entries.push(timeTableEntry);
        // @ts-ignore possible null
        else if (timeTableEntry.time.toISOTime() > timeTables[0].endTime.toISOTime())
            result.entries.push(timeTableEntry);
    }

    return result;
}

/**
 * Get schedule for the day
 * @param allCourses array of fetched courses
 * @param date to get schedule for
 * @returns a TimeTable with all entries for the day
 */
function getSchedule(allCourses: Array<Course>, date: DateTime): TimeTable {
    let courses = getCoursesByDate(allCourses, date);

    let timeTables: Array<TimeTable> = [];
    for (let course of courses) {
        timeTables.push(
            getTimeTable(course.type, date, getCourseDayByDate(course, date))
        );
    }

    return mergeSchedules(timeTables);
}

/**
 * Get next gong for today or first gong tomorrow if time for last of the day has passed.
 * @param allCourses array of fetched courses
 * @returns TimeTableEntry for upcoming gong or undefined i none
 */
function getNextGong(allCourses:Array<Course>): TimeTableEntry | undefined {
    let today = getSchedule(allCourses, DateTime.now());
    let tomorrow = getSchedule(allCourses, DateTime.now().plus({day: 1}));

    for (let entry of today.entries) {
        if (entry["time"] > DateTime.now()) return entry;
    }

    if (tomorrow.entries.length >= 0)
        return tomorrow.entries[0];

    return undefined
}

export {
    timeTableExists,
    getTimeTableJson,
    getTimeTable,
    getCoursesByDate,
    getCourseDayByDate,
    getNextGong,
    mergeSchedules,
    getSchedule,
};
