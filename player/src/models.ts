class Message {
    name: string = 'undefined';
    type?: string;
    zones?: Array<string>;

    constructor(name: string, zones?:Array<string>, type?: string) {
        this.name = name
        this.zones = zones
        this.type = type
    }

    toString() {
        return `${this.name}, ${this.type}, ${this.zones}`
    }
}

export { Message }