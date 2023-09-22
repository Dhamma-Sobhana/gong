import { scheduleJob, Job } from 'node-schedule'
import { DateTime } from 'luxon';

import { Course, TimeTableEntry } from "./models";
import { parseSchedule, fetchAndPersist, fetchFromCache } from './fetch';
import { getNextGong, getSchedule } from './schedule';

class Automation {
    enabled: boolean = false
    job?: Job = undefined
    fetchJob?: Job = undefined
    fetchTime: DateTime = DateTime.fromISO("01:00")
    lastFetch?: DateTime
    callback: Function
    courses: Array<Course> = []
    locationId?: number

    /**
     * Create an Automation to be used by server
     * @param callback function to be called when schedule executes
     */
    constructor(callback:Function, locationId:number|undefined) {
        this.callback = callback
        this.locationId = locationId
        this.fetch(locationId, false)
        this.scheduleFetch()
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
            this.callback(entry.location)
            this.schedule(this.getNextGong())
        });
    }

    /**
     * Schedule fetching of schedule regurlarly
     */
    scheduleFetch() {
        console.log(`[automation] Scheduling fetch of schedule every day at ${this.fetchTime.toLocaleString(DateTime.TIME_24_SIMPLE)}`)
        this.fetchJob?.cancel()
        this.fetchJob = scheduleJob(`${this.fetchTime.minute} ${this.fetchTime.hour} * * *`, () => {
            console.log(`[automation] Fetching schedule`);
            this.fetch(this.locationId, true)
        });
    }

    /**
     * Cancel upcoming gong and fetch
     */
    cancel() {
        this.job?.cancel()
        this.fetchJob?.cancel()
    }

    /**
     * Enable or disable automation and schedule next gong
     * @param enable optional set to false to diasable automation
     */
    enable(enable?: boolean) {
        if (enable !== undefined && enable === false) {
            this.enabled = false
            console.log('[automation] Disabled')
            this.cancel()
        } else {
            this.enabled = true
            console.log('[automation] Enabled')
            this.schedule(this.getNextGong())
            this.scheduleFetch()
        }
    }

    /**
     * Fetch courses from remote service, do sanity check, parse data and save result
     * @param locationId location id used in query
     * @param fake use fake data stored locally instead of hitting remote
     */
    async fetch(locationId:number|undefined, fake:boolean = false) {
        if (locationId == undefined)
            return

        let courses = await fetchAndPersist(locationId, fake)
        
        if (courses) {
            this.lastFetch = DateTime.now()
            this.courses = parseSchedule(courses)
            console.log(`[automation] Fetched schedule for ${this.courses.length} courses from remote server`)
        } else {
            courses = fetchFromCache()

            if (courses) {
                this.courses = parseSchedule(courses)
                console.log(`[automation] Fetched schedule for ${this.courses.length} courses from disk cache`)
            } else {
                console.log(`[automation] Error: Failed to fetch schedule from both remote server and disk cache`)
            }
        }
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