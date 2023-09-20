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

    /**
     * Create an Automation to be used by server
     * @param callback function to be called when schedule executes
     */
    constructor(callback:Function) {
        this.callback = callback
        this.fetch()
    }

    /**
     * Schedule a job to play gong at a certain time using callback function.
     * Reschedules with next gong on execution
     * @param entry to schedule
     * @returns nothing
     */
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

    /**
     * Cancel upcoming gong
     */
    cancel() {
        this.job?.cancel()
    }

    /**
     * Enable or disable automation and schedule next gong
     * @param enable optional set to false to diasable automation
     */
    enable(enable?: boolean) {
        if (enable !== undefined && enable === false) {
            this.enabled = false
            console.log('[automation] Disabled')
        } else {
            this.enabled = true
            console.log('[automation] Enabled')
            this.schedule(this.getNextGong())
        }
    }

    /**
     * Populate coures with simulated data
     */
    fetch() {
        this.courses = fakeFetchAndParseCourses()
    }

    /**
     * If automation is enabled, return next upcoming gong
     * @returns TimeTableEntry of next gong
     */
    getNextGong() {
        if (!this.enabled || !this.courses)
            return undefined

        return getNextGong(this.courses)
    }

    /**
     * Get array of upcoming gongs for today and tomorrow
     * @returns array with entries
     */
    getSchedule() {
        let schedule = getSchedule(this.courses, DateTime.now());
        let entries = schedule.entries.concat(getSchedule(this.courses, DateTime.now().plus({days: 1})).entries)

        return entries.filter(entry => entry.time >= DateTime.now())
    }
}

export {
    Automation
}