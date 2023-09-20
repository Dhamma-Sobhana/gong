import { DeviceStatus, Status } from "../src/models"
import { aggregateDeviceStatus, updateDevicesStatus } from '../src/devices'
import { DateTime } from "luxon"

let devices:Array<DeviceStatus>

jest.useFakeTimers()

beforeEach(() => {
    devices = []
    for (let device of ['player', 'remote']) {
        devices.push(new DeviceStatus(device))
    }
})

test('Aggregate device status', () => {

    let status = aggregateDeviceStatus(devices)

    expect(status.ok).toBe(0)
    expect(status.warning).toBe(0)
    expect(status.failed).toBe(2)

    devices[0].update()

    status = aggregateDeviceStatus(devices)

    expect(status.ok).toBe(1)
    expect(status.warning).toBe(0)
    expect(status.failed).toBe(1)
})

test('Update status based on time', () => {
    expect(devices[0].status).toBe(Status.Failed)
    
    devices[0].update()

    expect(devices[0].status).toBe(Status.OK)

    jest.setSystemTime(DateTime.now().plus({minutes: 10}).toJSDate());

    updateDevicesStatus(devices)
    expect(devices[0].status).toBe(Status.Warning)

    jest.setSystemTime(DateTime.now().plus({minutes: 60}).toJSDate());

    updateDevicesStatus(devices)
    expect(devices[0].status).toBe(Status.Failed)

    devices[0].update()

    expect(devices[0].status).toBe(Status.OK)
})