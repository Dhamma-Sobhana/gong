import { Server } from "./server";
import { client } from "./mqtt";

process.env.TZ = 'Europe/Stockholm'

const gongRepeat = process.env.GONG_REPEAT !== undefined ? parseInt(process.env.GONG_REPEAT) : 1

// Instantiate server object
const server = new Server(client, (process.env.DEVICES || '').split(','), gongRepeat);