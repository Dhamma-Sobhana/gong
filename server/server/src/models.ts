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
    timestamp?: number

    constructor(name: string) {
        this.name = name
    }

    update = (type?: string, zones?: Array<string>) => {
        if (type !== undefined)
            this.type = type
        if (zones !== undefined)
            this.zones = zones
        this.timestamp = Date.now()
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
    start: string
    end: string

    constructor(type: string, start: string, end: string) {
        this.type = type
        this.start = start
        this.end = end
    }

    toString() {
        return `${this.type}, ${this.start} - ${this.end}`
    }
}

class TimeTable {
    time: string
    type: string
    location: Array<string>

    constructor(time: string, type: string, location: Array<string>) {
        this.time = time
        this.type = type
        this.location = location
    }
}

export { Message, DeviceStatus, PlayMessage, Course, TimeTable }