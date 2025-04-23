import express, { Express, Request, Response } from 'express';
import { DateTime } from 'luxon';

const bodyParser = require('body-parser')
const nunjucks = require('nunjucks')
const dateFilter = require('nunjucks-date')

import { aggregateDeviceStatus } from './devices';
import { Server } from './server';
import { logArray } from './log'
import { PlayMessage, StatusMessage } from './models';

// Express.js and Nunjucks for web interface
const app: Express = express();
const http_port = process.env.HTTP_PORT || 8080;

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

let njEnv = nunjucks.configure('views', {
    autoescape: true,
    express: app
})

dateFilter.install(njEnv)
dateFilter.setDefaultFormat('YYYY-MM-DD HH:mm:ss.SS');

app.set('view engine', 'html')
app.use(express.static('public'))

let server = app.listen(http_port, () => {
    console.log(`[web]: Listening on port ${http_port}`)
})

function setupWebRoutes(server:Server, client:any) {
    app.get('/', (req: Request, res: Response) => {
        res.render('index.njk', {
            enabled: server.enabled,
            devices: server.devices,
            device_status: aggregateDeviceStatus(server.devices),
            playing: server.gongPlaying,
            log: logArray.slice(),
            automation: server.automation,
            system_time: DateTime.now()
        })
    })

    app.get('/status', (req: Request, res: Response) => {
        let message = new StatusMessage(server.enabled, server.automation.enabled, server.gongPlaying)
        res.json(message)
    })

    app.post('/enable', (req: Request, res: Response) => {
        console.log('[web] Enable/Disable')
        server.enable(!server.enabled)
        res.redirect('/')
    })

    app.post('/activated', (req: Request, res: Response) => {
        console.log('[web] Play/Stop')
        server.playGong(["all"], server.gongRepeat)
        res.redirect('/')
    })

    app.post('/ping', (req: Request, res: Response) => {
        console.log('[web] Refresh')
        client.publish(`ping`);
        res.redirect('/')
    })

    app.post('/automation/enable', (req: Request, res: Response) => {
        console.log('[web] Automation enabled')
        server.automation.enable()
        res.redirect('/')
    })

    app.post('/automation/disable', (req: Request, res: Response) => {
        console.log('[web] Automation disabled')
        server.automation.enable(false)
        res.redirect('/')
    })

    app.post('/automation/entry/enable', (req: Request, res: Response) => {
        let entryDateTime = DateTime.fromISO(req.body.entry_id)
        console.log(`[web] Automation enable entry: ${entryDateTime}`)

        server.automation.schedule.setTimeTableEntryStatus(entryDateTime, true)
        server.automation.scheduleGong(server.automation.getNextGong())
        res.redirect('/')
    })

    app.post('/automation/entry/disable', (req: Request, res: Response) => {
        let entryDateTime = DateTime.fromISO(req.body.entry_id)
        console.log(`[web] Automation disable entry: ${entryDateTime}`)

        server.automation.schedule.setTimeTableEntryStatus(entryDateTime, false)
        server.automation.scheduleGong(server.automation.getNextGong())
        res.redirect('/')
    })

    app.get('/automation/schedule', (req: Request, res: Response) => {
        let courses = server.automation.getCourses()
        let start = courses[0].start
        let end = courses[courses.length - 1].end
        
        let schedule = server.automation.schedule.getScheduleByDatePeriod(start, end)
        
        res.render('schedule.njk', {
            schedule: schedule?.entries || [],
            start: start,
            end: end,
        })
    })

    app.post('/test/stop', (req: Request, res: Response) => {
        console.log(`[web][test]: Stop`)
        server.stop()
        res.redirect('/')
    })

    app.post('/test/device/play', (req: Request, res: Response) => {
        let device = req.body.device
        let type = req.body.type

        if (device === undefined || device == "none")
            return res.redirect('/')

        let message = JSON.stringify(new PlayMessage(type, ['all'], 1000))

        console.log(`[web][test]: Test '${type}' on '${device}'`)
        client.publish(`test/${device}`, message)
        res.redirect('/')
    })
}

export { app, server, setupWebRoutes }