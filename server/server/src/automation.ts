import { scheduleJob, Job } from 'node-schedule'

import { DateTime } from 'luxon';

import { Course, TimeTableEntry } from "./models";
import { fakeFetchAndParseCourses } from './fetch';
import { getNextGong, getSchedule } from './schedule';

class Automation {
    enabled: boolean = false
    job?: Job = undefined
    called: boolean = false
    callback: Function
    courses: Array<Course> = []

    constructor(callback:Function) {
        this.callback = callback
        this.fetch()
    }

    schedule(entry?: TimeTableEntry) {
        if (entry === undefined)
            return
        
        console.log(`[automation] Scheduling playback of gong at ${entry.time.toLocaleString(DateTime.TIME_24_SIMPLE)} in ${entry.location}`)
        this.job?.cancel()
        this.job = scheduleJob(entry.time.toJSDate(), () => {
            console.log(`[automation] Executing playing of gong in ${entry.location}`);
            this.called = true
            this.callback(entry.location)
            this.schedule(this.getNextGong())
        });
    }

    cancel() {
        this.job?.cancel()
    }

    enable(disable?: boolean) {
        if (disable !== undefined && disable == false) {
            this.enabled = false
            console.log('[automation] Disabled')
        } else {
            this.enabled = true
            console.log('[automation] Enabled')
            this.schedule(this.getNextGong())
        }
    }

    fetch() {
        this.courses = fakeFetchAndParseCourses()
    }

    getNextGong() {
        if (!this.enabled || !this.courses)
            return undefined

        return getNextGong(this.courses)
    }

    getSchedule() {
        let schedule = getSchedule(this.courses, DateTime.now());
        return schedule.entries.concat(getSchedule(this.courses, DateTime.now().plus({days: 1})).entries)
    }
}

export {
    Automation
}