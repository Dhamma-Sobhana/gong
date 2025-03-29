const fs = require("fs");
import path from "path";
import { DateTime, Interval } from "luxon";
import { parseJson } from "./lib";
import { Course, DisabledEntries, TimeTable, TimeTableEntry } from "./models";
import { writeDisabledEntries } from "./storage";

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
function getTimeTable(courseType: string, date: DateTime, courseDay: number, repeat: number): TimeTable {
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
                        timeTable.courseType,
                        courseDay,
                        entry["repeat"] ?? repeat
                    )
                );
            }
        }
    }

    return timeTable;
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
 * Find all courses that are active on one day. Usully returns one but can 
 * return two or three when one course end and one or two start on the same day.
 * @param allCourses available courses
 * @param date to get courses for
 * @returns array of 1-3 courses
 */
function getCoursesByDate(allCourses: Array<Course>, date: DateTime): Array<Course> {
    let courses: Array<Course> = [];
    
    for (let course of allCourses) {
        if (course["start"] <= date && course["end"] >= date)
            courses.push(course);
    }

    if (courses.length === 0) {
        let today = date.toISODate();
        // @ts-ignore: Object is possibly 'null'.
        courses.push(new Course("default", today, today));
    }

    return courses;
}

/**
 * If more then one course on the same day, include priorited courses.
 * If three courses, course inlcude the one ending on the date and the shortest of two other two.
 * Else if two courses and one is ending on the date, include both.
 * Else return the shortest course.
 * @param allCourses array of courses
 * @param date data to get courses for
 * @returns array of filtered courses
 */
function filterCoursesByPriority(allCourses: Array<Course>, date: DateTime): Array<Course> {
    if (allCourses.length <= 1)
        return allCourses

    let courses: Array<Course> = [];
    allCourses.sort((a, b) => a.start.toMillis() - b.start.toMillis());

    if (allCourses.length == 3) {
        // Ongoing course ending on this day
        let first = allCourses.shift()
        if (first !== undefined)
            courses.push(first)

        // Keep the shortest course starting on this date
        if (allCourses[0].length() < allCourses[1].length()) {
            courses.push(allCourses[0])
        } else {
            courses.push(allCourses[1])
        }
    } else if (allCourses.length == 2) {
        // If one course ends today, return both
        if (allCourses[0].end.startOf('day').toISODate() == date.startOf('day').toISODate() || allCourses[1].end.startOf('day').toISODate() == date.startOf('day').toISODate())
            courses = allCourses
        else {
            // Service period with course during
            if (allCourses[0].length() < allCourses[1].length()) {
                courses.push(allCourses[0])
            } else {
                courses.push(allCourses[1])
            }
        }
    }
    
    return courses;
}


/**
 * Merge two TimeTables. If first one has endTime defined, entries from
 * seconds TimeTable will be ignored before that time.
 * @param timeTables 1 or 2 TimeTable
 * @param filterByEndTime set to false to ignore filtering by endTime
 * @returns a new TimeTable without overlapping entries
 */
function mergeSchedules(timeTables: Array<TimeTable>, filterByEndTime: boolean = true): TimeTable {
    if (timeTables.length == 1)
        return timeTables[0];

    let result = new TimeTable("mixed");
    // If first course does not include end time or endTime is ignored, include all
    if (timeTables[0].endTime === undefined || !filterByEndTime) {
        // Include all entries from first time table that are before the first entry of the second time table
        if (timeTables[1].entries.length > 0) {
            timeTables[0].entries = timeTables[0].entries.filter(e => e.time < timeTables[1].entries[0].time)
        }

        result.entries = timeTables[0].entries.concat(timeTables[1].entries)
        return result
    }

    result.entries = timeTables[0].entries;

    for (let timeTableEntry of timeTables[1].entries) {
        // @ts-ignore possible null
        if (timeTableEntry.time.toISOTime() > timeTables[0].endTime.toISOTime())
            result.entries.push(timeTableEntry);
    }

    return result;
}

class Schedule {
    courses: Array<Course>
    timeTable: TimeTable
    today: DateTime = DateTime.now()
    repeat: number
    disabledEntries?: DisabledEntries

    constructor(courses: Array<Course>, repeat: number, disabledEntries?: DisabledEntries|undefined) {
        this.courses = courses
        this.repeat = repeat
        this.disabledEntries = disabledEntries
        this.timeTable = this.updateSchedule(this.today)
    }

    setCourses(courses: Array<Course>) {
        this.courses = courses
        this.updateSchedule(this.today)
    }

    getCourses() {
        return this.courses
    }

    /**
     * Get schedule for the day
     * @param date to get schedule for
     * @returns a TimeTable with all entries for the day
     */
    getScheduleByDate(date: DateTime): TimeTable {
        let courses = getCoursesByDate(this.courses, date);
        courses = filterCoursesByPriority(courses, date)

        let timeTables: Array<TimeTable> = [];
        for (let course of courses) {
            timeTables.push(
                getTimeTable(course.type, date, getCourseDayByDate(course, date), this.repeat)
            );
        }
        
        return mergeSchedules(timeTables);
    }

    /**
     * Update schedule if day has changed before returning todays schedule
     * @returns a TimeTable with all entries for today and tomorrow
     */
    getSchedule():TimeTable {
        if (this.today.toISODate() !== DateTime.now().toISODate()) {
            this.updateSchedule(DateTime.now())
        }
        
        return this.timeTable
    }

    /**
     * Gets schedule for provided date and day after, disabling any time table entries manually disabled
     * @param date to create schedule for this date
     * @returns the new time table
     */
    updateSchedule(date: DateTime) {
        this.today = date

        let today = this.getScheduleByDate(this.today);
        let tomorrow = this.getScheduleByDate(this.today.plus({day: 1}));
        
        let timeTable = mergeSchedules([today, tomorrow], false)
        
        // Patch time table entries disabling manually disabled entries
        for (let entry of timeTable.entries) {
            if (this.disabledEntries?.entries.some(e => e.equals(entry.time))) {
                entry.active = false
            }
        }
       
        this.timeTable = timeTable
        
        return this.timeTable
    }

    /**
     * Get next gong for today or first gong tomorrow if time for last of the day has passed.
     * @returns TimeTableEntry for upcoming gong or undefined i none
     */
    getNextGong(): TimeTableEntry | undefined {
        if (this.today.toISODate() !== DateTime.now().toISODate()) {
            this.updateSchedule(DateTime.now())
        }

        for (let entry of this.timeTable.entries) {
            if (entry.active && entry["time"] > DateTime.now())
                return entry;
        }

        return undefined
    }

    /**
     * Change status of an time table entry and write do disk
     * @param entryDateTime Entry to find by date time
     * @param active new status
     */
    setTimeTableEntryStatus(entryDateTime:DateTime, active:boolean) {
        this.disabledEntries?.update(entryDateTime, active)
        writeDisabledEntries(this.disabledEntries)

        for (let entry of this.timeTable.entries) {
            if (entryDateTime.equals(entry.time)) {
                entry.active = active
                return
            }
        }
    }
}

export {
    timeTableExists,
    getTimeTableJson,
    getTimeTable,
    getCourseDayByDate,
    getCoursesByDate,
    filterCoursesByPriority,
    mergeSchedules,
    Schedule
};
