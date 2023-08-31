import express, { Express } from 'express';
const nunjucks = require('nunjucks')
const dateFilter = require('nunjucks-date')

// Express.js and Nunjucks for web interface
const app: Express = express();
const http_port = process.env.HTTP_PORT || 8080;

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

export { app, server }