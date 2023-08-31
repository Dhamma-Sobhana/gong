import { Server } from "./server";

process.env.TZ = 'Europe/Stockholm'

const gongRepeat = process.env.GONG_REPEAT !== undefined ? parseInt(process.env.GONG_REPEAT) : 1

// Instantiate server object
const server = new Server((process.env.DEVICES || '').split(','), gongRepeat);