class Pong {
    name: string = 'undefined';
    type: string = 'undefined';
    zones?: Array<string>;
}

class DeviceStatus {
    name: string;
    type?: string;
    zones?: Array<string>;
    timestamp?: number

    constructor(name: string) {
        this.name = name
    }

    update = (type: string, zones?: Array<string>) => {
        this.type = type
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

export { Pong, DeviceStatus }