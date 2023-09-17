import { scheduleJob, Job } from 'node-schedule'

import { TimeTableEntry } from "./models";
import { DateTime } from 'luxon';

class Automation {
    enabled: boolean = false
    job?: Job = undefined
    called: boolean = false

    schedule(entry: TimeTableEntry) {
        console.log(`[automation] Scheduling playback of gong at ${entry.time.toLocaleString(DateTime.TIME_24_SIMPLE)} in ${entry.location}`)
        this.job = scheduleJob(entry.time.toJSDate(), () => {
            console.log(`[automation] Executing playing of gong in ${entry.location}`);
            this.called = true
        });
    }

    cancel() {
        this.job?.cancel()
    }
}

export {
    Automation
}