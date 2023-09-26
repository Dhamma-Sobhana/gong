import { DateTime } from 'luxon'

class Message {
    name: string = 'undefined';
    type?: string;
    locations?: Array<string>;

    constructor(name?: string, locations?: Array<string>, type?: string) {
        if (name !== undefined)
            this.name = name
        this.locations = locations
        this.type = type
    }

    toString() {
        return `${this.name}, ${this.type}, ${this.locations}`
    }
}

enum Status {
    OK = '🟢',
    Warning = '🟡',
    Failed = '🔴'
}

class DeviceStatus {
    name: string;
    type?: string;
    locations?: Array<string>;
    timestamp?: DateTime
    status: Status = Status.Failed

    constructor(name: string) {
        this.name = name
    }

    update = (type?: string, locations?: Array<string>) => {
        if (type !== undefined)
            this.type = type
        if (locations !== undefined)
            this.locations = locations
        this.timestamp = DateTime.now()
        this.status = Status.OK
    }

    updateStatus(status:Status) {
        this.status = status
    }

    toString() {
        if (this.type !== undefined)
            return `${this.name} (${this.type}) Last seen: ${this.timestamp?.toISO()}`
        else
            return `${this.name}`
    }
}

class PlayMessage {
    locations?: Array<string> = ["all"];
    repeat: number = 4

    constructor(locations?: Array<string>, repeat?: number) {
        if (locations !== undefined)
            this.locations = locations

        if (repeat !== undefined)
            this.repeat = repeat
    }
}

class Course {
    type: string
    start: DateTime
    end: DateTime
    endTime?: DateTime

    constructor(type: string, start: string, end: string, endTime?:DateTime) {
        this.type = type
        this.start = DateTime.fromISO(start)
        this.end = DateTime.fromISO(end).set({hour: 23, minute: 59, second: 59})
        if (endTime)
            this.endTime = endTime
    }

    toString() {
        return `${this.type}, ${this.start} - ${this.end}`
    }
}

class TimeTable {
    courseType: string
    entries: Array<TimeTableEntry> = []
    endTime?: DateTime

    constructor(courseType: string, entries?: Array<TimeTableEntry>, endTime?: DateTime) {
        this.courseType = courseType
        if (entries)
            this.entries = entries
        if (endTime)
            this.endTime = endTime
    }

    setEndTime(time:string) {
        this.endTime = DateTime.fromISO(time)
    }
}

class TimeTableEntry {
    time: DateTime
    type: string
    location: Array<string>
    courseType: string
    courseDay: number

    constructor(date: DateTime, time: string, type: string, location: Array<string>, courseType: string, courseDay: number) {
        this.time = date.set({
            hour: parseInt(time.substring(0, 2)),
            minute: parseInt(time.substring(3, 5)),
            second: 0,
            millisecond: 0
        })
        this.type = type
        this.location = location
        this.courseType = courseType
        this.courseDay = courseDay
    }

    getCourse() {
        return `${this.courseType}: ${this.courseDay}`
    }
}


export { Message, Status, DeviceStatus, PlayMessage, Course, TimeTable, TimeTableEntry }