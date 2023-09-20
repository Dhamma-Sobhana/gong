import { DateTime } from 'luxon'

class Message {
    name: string = 'undefined';
    type?: string;
    zones?: Array<string>;

    constructor(name?: string, zones?: Array<string>, type?: string) {
        if (name !== undefined)
            this.name = name
        this.zones = zones
        this.type = type
    }

    toString() {
        return `${this.name}, ${this.type}, ${this.zones}`
    }
}

class DeviceStatus {
    name: string;
    type?: string;
    zones?: Array<string>;
    timestamp?: DateTime

    constructor(name: string) {
        this.name = name
    }

    update = (type?: string, zones?: Array<string>) => {
        if (type !== undefined)
            this.type = type
        if (zones !== undefined)
            this.zones = zones
        this.timestamp = DateTime.now()
    }

    toString() {
        if (this.type !== undefined)
            return `${this.name} (${this.type}) Last seen: ${this.timestamp}`
        else
            return `${this.name}`
    }
}

class PlayMessage {
    zones?: Array<string> = ["all"];
    repeat: number = 4

    constructor(zones?: Array<string>, repeat?: number) {
        if (zones !== undefined)
            this.zones = zones

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
    type: string
    entries: Array<TimeTableEntry> = []
    endTime?: DateTime

    constructor(type: string, entries?: Array<TimeTableEntry>, endTime?: DateTime) {
        this.type = type
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

    constructor(date: DateTime, time: string, type: string, location: Array<string>) {
        this.time = date.set({
            hour: parseInt(time.substring(0, 2)),
            minute: parseInt(time.substring(3, 5)),
            second: 0,
            millisecond: 0
        })
        this.type = type
        this.location = location
    }
}


export { Message, DeviceStatus, PlayMessage, Course, TimeTable, TimeTableEntry }