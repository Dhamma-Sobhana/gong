import * as Sentry from "@sentry/node";
import { scheduleJob, Job } from 'node-schedule'
import { DateTime } from 'luxon';

import { TimeTableEntry } from "./models";
import { parseSchedule, fetchAndPersist, fetchFromCache } from './fetch';
import { Schedule } from './schedule';
import { readDisabledEntries } from "./storage";

class Automation {
    enabled: boolean = false
    job?: Job = undefined
    fetchJob?: Job = undefined
    fetchTime: DateTime = DateTime.fromISO("01:00")
    lastFetch?: DateTime
    callback: Function
    locationId?: number
    schedule: Schedule
    repeat: number

    /**
     * Create an Automation to be used by server
     * @param callback function to be called when schedule executes
     */
    constructor(callback:Function, locationId:number|undefined, automationEnabled:boolean = false, repeat:number) {
        this.callback = callback
        this.locationId = locationId
        let disabledEntries = readDisabledEntries()
        console.log(`[automation] Read ${disabledEntries?.entries.length} disabled entries from settings file`)
        this.repeat = repeat
        this.schedule = new Schedule([], this.repeat, disabledEntries)

        if (automationEnabled) {
            this.enable()
        }
    }

    /**
     * Schedule a job to play gong at a certain time using callback function.
     * Reschedules with next gong on execution
     * @param entry to schedule
     * @returns nothing
     */
    scheduleGong(entry?: TimeTableEntry) {
        if (entry === undefined)
            return
        
        console.log(`[automation] Scheduling playback of gong at ${entry.time.toLocaleString(DateTime.TIME_24_SIMPLE)} in ${entry.locations}`)
        this.job?.cancel()
        this.job = scheduleJob(entry.time.toJSDate(), () => {
            console.log(`[automation] Executing playing of gong in ${entry.locations}`);
            this.callback(entry.locations)
            this.scheduleGong(this.getNextGong())
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
            this.fetch(this.locationId)
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
    async enable(enable?: boolean) {
        if (enable !== undefined && enable === false) {
            this.enabled = false
            console.log('[automation] Automation disabled')
            this.cancel()
        } else {
            this.enabled = true
            console.log('[automation] Automation enabled')
            await this.fetch(this.locationId)
            this.scheduleGong(this.getNextGong())
            this.scheduleFetch()
        }
    }

    /**
     * Fetch courses from remote service, do sanity check, parse data and save result
     * @param locationId location id used in query
     */
    async fetch(locationId:number|undefined) {
        if (locationId == undefined)
            return

        let courses = await fetchAndPersist(locationId)
        
        if (courses) {
            this.lastFetch = DateTime.now()
            this.schedule.setCourses(parseSchedule(courses))
            console.log(`[automation] Fetched schedule for ${this.schedule.getCourses().length} courses from remote server`)
        } else {
            courses = fetchFromCache()

            if (courses) {
                this.schedule.setCourses(parseSchedule(courses))
                console.log(`[automation] Fetched schedule for ${this.schedule.getCourses().length} courses from disk cache`)
            } else {
                console.log(`[automation] ERROR: Failed to fetch schedule from both remote server and disk cache`)
                Sentry.captureMessage(`Failed to fetch courses from remote and disk cache`)
            }
        }
    }

    /**
     * If automation is enabled, return next upcoming gong
     * @returns TimeTableEntry of next gong
     */
    getNextGong() {
        if (!this.enabled)
            return undefined

        return this.schedule.getNextGong()
    }

    /**
     * Get array of upcoming gongs for today and tomorrow
     * @returns array with entries
     */
    getSchedule() {
        let schedule = this.schedule.getSchedule()

        return schedule.entries.filter(entry => entry.time >= DateTime.now())
    }

    getEntryByDateTime(entryDateTime:DateTime):TimeTableEntry|undefined {
        let schedule = this.schedule.getSchedule()

        return schedule.entries.find(entry => entry.time == entryDateTime)
    }

    /**
     * Get courses from today and forward
     * @returns array of courses
     */
    getCourses() {
        let courses = this.schedule.getCourses()

        if (['test', 'development'].includes(process.env.NODE_ENV || ''))
            return courses

        return courses.filter(entry => entry.end >= DateTime.now())
    }
}

export {
    Automation
}