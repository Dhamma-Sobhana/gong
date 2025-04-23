import { DateTime, Interval } from 'luxon'

enum Status {
    OK = '🟢',
    Warning = '🟡',
    Failed = '🔴',
    Disabled = '⚪️'
}

enum State {
    Unknown = 'Unknown',
    Playing = 'Playing',
    Played = 'Played',
    Activated = 'Activated',
    Deactivated = 'Deactivated',
    Waiting = 'Waiting'
}

function stringToStatus(strStatus: string|undefined):Status {
    if (strStatus === undefined)
        return Status.OK
    
    switch (strStatus.toLowerCase()) {
        case 'ok':
            return Status.OK
        case 'warning':
            return Status.Warning
        case 'failed':
            return Status.Failed
        case 'disabled':
            return Status.Disabled
        default:
            throw 'Unknown status value'
    }
}

class Message {
    name: string = 'undefined';
    type?: string;
    locations?: Array<string>;
    _status?: Status;
    state?: State;

    constructor(name?: string, locations?: Array<string>, type?: string, status?: string, state?: State) {
        if (name !== undefined)
            this.name = name
        this.locations = locations
        this.type = type
        this.status = status
        this.state = state
    }

    public set status(status: string|undefined) {
        this._status = stringToStatus(status)
    }

    public get status(): Status|undefined {
        return this._status
    }

    toString() {
        return `${this.name}, ${this.type}, ${this.locations}`
    }
}

class StatusMessage {
    enabled: boolean = false
    automation: boolean = false
    playing: boolean = false

    constructor(enabled:boolean, automation:boolean, playing:boolean) {
        this.enabled = enabled
        this.automation = automation
        this.playing = playing
    }
}


class DeviceStatus {
    name: string;
    type?: string;
    locations?: Array<string>;
    timestamp?: DateTime
    status: Status = Status.Failed
    state: State = State.Unknown

    constructor(name: string) {
        this.name = name
    }

    update = (type?: string, locations?: Array<string>, status?: Status, state?: State) => {
        if (type !== undefined)
            this.type = type
        if (locations !== undefined)
            this.locations = locations
        this.timestamp = DateTime.now()
        
        if (status !== undefined)
            this.status = status
        else
            this.status = Status.OK

        if (state !== undefined)
            this.state = state
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
    type: string = 'gong'
    locations?: Array<string> = ["all"];
    repeat: number = 4

    constructor(type?: string, locations?: Array<string>, repeat?: number) {
        if (type !== undefined)
            this.type = type
        
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

    length() {
        return Interval.fromDateTimes(this.start, this.end).length("days")
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
    repeat: number = -1
    active: boolean = true

    constructor(date: DateTime, time: string, type: string, location: Array<string>, courseType: string, courseDay: number, repeat?: number) {
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
        if (repeat !== undefined)
            this.repeat = repeat
    }

    getCourse() {
        return `${this.courseType}: ${this.courseDay}`
    }
}

class DisabledEntries {
    entries: Array<DateTime> = []

    constructor(entries?: Array<DateTime>) {
        if (entries)
            this.entries = entries
    }

    update(entry: DateTime|undefined, active: boolean) {
        if (!entry)
            return

        if (active) {
            this.entries = this.entries.filter(e => !e.equals(entry));
        } else if (!this.entries.some(e => e.equals(entry))) {
            this.entries.push(entry)
        }
    }

    cleanup() {
        this.entries = this.entries.filter(entry => entry >= DateTime.now());
    }
}

class ManualEntry {
    from: DateTime
    to: DateTime
    locations: Array<string>
    repeat: number

    constructor(from: string, to: string, locations: Array<string>, repeat: number) {
        this.from = DateTime.fromFormat(from, 'HH:mm')
        this.to = DateTime.fromFormat(to, 'HH:mm')
        this.locations = locations
        this.repeat = repeat
    }
}


export { Message, StatusMessage, Status, State, DeviceStatus, PlayMessage, Course, TimeTable, TimeTableEntry, DisabledEntries, ManualEntry }