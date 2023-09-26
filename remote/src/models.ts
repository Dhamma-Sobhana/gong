class Message {
    name: string = 'undefined';
    type?: string;

    constructor(name?: string, type?: string) {
        if (name !== undefined)
            this.name = name
        this.type = type
    }

    toString() {
        return `${this.name}, ${this.type}`
    }
}

class DeviceStatus {
    name: string;
    type?: string;
    timestamp?: number

    constructor(name: string) {
        this.name = name
    }

    update = (type?: string) => {
        if (type !== undefined)
            this.type = type
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
    locations?: Array<string> = ["all"];
    repeat: number = 4

    constructor(locations?: Array<string>, repeat?: number) {
        if (locations !== undefined)
            this.locations = locations

        if (repeat !== undefined)
            this.repeat = repeat
    }
}


export { Message, DeviceStatus, PlayMessage }