import express, { Express, Request, Response } from 'express';
import { DateTime } from 'luxon';

const bodyParser = require('body-parser')
const nunjucks = require('nunjucks')
const dateFilter = require('nunjucks-date')
const cookieParser = require('cookie-parser');

import { aggregateDeviceStatus } from './devices';
import { Server } from './server';
import { logArray } from './log'
import { getGongTypes } from './lib'
import { PlayMessage, Status, StatusMessage } from './models';
import { balenaUpdateEnvironmentVariable } from './balena';

// Express.js and Nunjucks for web interface
const app: Express = express();
const http_port = process.env.HTTP_PORT || 8080;

const pin_code = process.env.PIN_CODE;
const salt = 'gong';
const access_hash = require('crypto').createHash('sha256').update(`${pin_code}${salt}`, 'utf8').digest('hex');
const cookie_max_age = 1000 * 60 * 60 * 12; // 12 hours

app.use(cookieParser(), function(req, res, next) {
    let token = req.cookies.token;

    // If pin is disabled, token is correct, accessing login screen or static files
    if (pin_code === undefined || token == access_hash || req.path === '/login' || req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.endsWith('.png') || req.path.endsWith('.json') || req.path.endsWith('.mp3')) {
        next();
    } else {
        res.redirect('/login');
    }
});

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

let njEnv = nunjucks.configure('views', {
    autoescape: true,
    express: app
})

dateFilter.install(njEnv)
dateFilter.setDefaultFormat('YYYY-MM-DD HH:mm:ss.SS');


njEnv.addFilter('safeFilter', (str: string) => njEnv.filters.safe(str));

njEnv.addFilter('booleanToImg', function(status:boolean) {
    if (status)
        return '<img src="/images/ok.png" alt="OK" class="status" />'

    return '<img src="/images/error.png" alt="Error" class="status" />'
});

njEnv.addFilter('statusToImg', function(status:string) {
    switch(status) {
        case Status.OK:
            return '<img src="/images/ok.png" alt="OK" class="status" />'
        case Status.Warning:
            return '<img src="/images/warning.png" alt="Warning" class="status" />'
        case Status.Failed:
            return '<img src="/images/error.png" alt="Failed" class="status" />'
        case Status.Disabled:
            return '<img src="/images/disabled.png" alt="Disabled" class="status" />'
        default:
            return '<img src="/images/unknown.png" alt="Unknown" class="status" />'
    }
});

app.set('view engine', 'html')
app.use(express.static('public'))

let server = app.listen(http_port, () => {
    console.log(`[web]: Listening on port ${http_port}`)
})

function setAccessCookie(res: Response) {
    if (pin_code !== undefined)
        res.cookie('token', access_hash, { maxAge: cookie_max_age, httpOnly: true });
}

function setupWebRoutes(server:Server, client:any) {
    app.get('/login', (req: Request, res: Response) => {
        res.render('login.njk', {
            "error": req.query.error
        })
    })

    app.post('/login', (req: Request, res: Response) => {
        let pin = req.body.pin;
        const hash = require('crypto').createHash('sha256').update(`${pin}${salt}`, 'utf8').digest('hex');

        if (hash == access_hash) {
            setAccessCookie(res)
            res.redirect('/');
        } else {
            res.redirect('/login?error=1');
        }
    })

    app.get('/', (req: Request, res: Response) => {
        setAccessCookie(res)

        res.render('index.njk', {
            enabled: server.enabled,
            status: server.systemStatus(),
            playing: server.gongPlaying,
            automation: server.automation,
            system_time: DateTime.now()
        })
    })

    app.get('/schedule', (req: Request, res: Response) => {
        res.render('schedule.njk', {
            enabled: server.enabled,
            status: server.systemStatus(),
            playing: server.gongPlaying,
            automation: server.automation,
            system_time: DateTime.now()
        })
    })

    app.get('/devices', (req: Request, res: Response) => {
        res.render('devices.njk', {
            enabled: server.enabled,
            status: server.systemStatus(),
            devices: server.devices,
            unknown_devices: server.unknownDevices,
            playing: server.gongPlaying,
            automation: server.automation,
            system_time: DateTime.now()
        })
    })

    app.get('/system', (req: Request, res: Response) => {
        res.render('system.njk', {
            enabled: server.enabled,
            status: server.systemStatus(),
            mqtt_connected: client.connected,
            playing: server.gongPlaying,
            automation: server.automation,
            unknown_devices: server.unknownDevices,
            device_status: aggregateDeviceStatus(server.devices),
            log: logArray.slice(),
            system_time: DateTime.now()
        })
    })


    app.get('/settings', (req: Request, res: Response) => {
        res.render('settings.njk', {
            enabled: server.enabled,
            status: server.systemStatus(),
            playing: server.gongPlaying,
            automation: server.automation,
            devices: server.devices,
            gong_repeat: server.gongRepeat,
            getGongTypes: getGongTypes,
            gong_type: server.gong_type,
            log: logArray.slice(),
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
        
        balenaUpdateEnvironmentVariable('DISABLED', (!server.enabled).toString())
        res.redirect('/settings')
    })

    app.post('/settings/gong-type', (req: Request, res: Response) => {
        let type = req.body['gong-type']

        console.log(`[web] Change gong type to '${type}'`)
        
        server.setGongType(type)

        res.redirect('/settings')
    })

    app.post('/settings/gong-repeat', (req: Request, res: Response) => {
        let repeat = req.body['gong-repeat']

        console.log(`[web] Change gong repeat to ${repeat}`)
        
        server.setGongRepeat(repeat)

        res.redirect('/settings')
    })

    app.post('/activated', (req: Request, res: Response) => {
        console.log('[web] Play/Stop')
        server.playGong(["all"], server.gongRepeat)
        res.redirect('/')
    })

    app.post('/ping', (req: Request, res: Response) => {
        console.log('[web] Refresh')
        client.publish(`ping`);
        res.redirect('/devices')
    })

    app.post(['/automation/enable', '/automation/disable'], (req: Request, res: Response) => {
        if (req.path.endsWith('/enable')) {
            console.log(`[web] Automation enabled`)
            server.automation.enable()
        } else {
            console.log('[web] Automation disabled')
            server.automation.enable(false)
        }

        balenaUpdateEnvironmentVariable('AUTOMATION', server.automation.enabled.toString())

        res.redirect('/settings')
    })

    app.post(['/automation/entry/enable', '/automation/entry/disable'], (req: Request, res: Response) => {
        let entryDateTime = DateTime.fromISO(req.body.entry_id)

        if (req.path.endsWith('/enable'))
            console.log(`[web] Automation enable entry: ${entryDateTime}`)
        else
            console.log(`[web] Automation disable entry: ${entryDateTime}`)

        server.automation.schedule.setTimeTableEntryStatus(entryDateTime, req.path.endsWith('/enable'))
        server.automation.scheduleGong(server.automation.getNextGong())

        res.redirect('/schedule')
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
        res.redirect('/settings')
    })

    app.post('/test/device/play', (req: Request, res: Response) => {
        let device = req.body.device
        let type = req.body.type

        if (device === undefined || device == "none")
            return res.redirect('/settings')

        let message = JSON.stringify(new PlayMessage(type, ['all'], 1000))

        console.log(`[web][test]: Test '${type}' on '${device}'`)
        client.publish(`test/${device}`, message)
        res.redirect('/settings')
    })
}

export { app, server, setupWebRoutes }