class Message {
    name: string = 'undefined';
    type?: string;
    locations?: Array<string>;
    status?: string;

    constructor(name?: string, locations?: Array<string>, type?: string, status?: string) {
        if (name !== undefined)
            this.name = name
        this.locations = locations
        this.type = type
        this.status = status
    }

    toString() {
        return `${this.name}, ${this.type}, ${this.locations}`
    }
}

class DeviceStatus {
    name: string;
    type?: string;
    locations?: Array<string>;
    timestamp?: number

    constructor(name: string) {
        this.name = name
    }

    update = (type?: string, locations?: Array<string>) => {
        if (type !== undefined)
            this.type = type
        if (locations !== undefined)
            this.locations = locations
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

type GongType = {
    name: string;
    file_name: string;
    test?: boolean;
};

export { Message, DeviceStatus, PlayMessage, GongType }