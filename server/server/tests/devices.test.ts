import { DeviceStatus, Status } from "../src/models"
import { aggregateDeviceStatus, numberOfActivePlayers, updateDevicesStatus } from '../src/devices'
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

    devices[1].updateStatus(Status.Disabled)

    status = aggregateDeviceStatus(devices)

    expect(status.ok).toBe(1)
    expect(status.warning).toBe(0)
    expect(status.failed).toBe(0)
    expect(status.disabled).toBe(1)
})

test('Update status based on time', () => {
    expect(devices[0].status).toBe(Status.Failed)
    
    devices[0].update()

    expect(devices[0].status).toBe(Status.OK)

    jest.setSystemTime(DateTime.now().plus({minutes: 2}).toJSDate());

    updateDevicesStatus(devices)
    expect(devices[0].status).toBe(Status.Warning)

    jest.setSystemTime(DateTime.now().plus({minutes: 10}).toJSDate());

    updateDevicesStatus(devices)
    expect(devices[0].status).toBe(Status.Failed)

    devices[0].update()

    expect(devices[0].status).toBe(Status.OK)

    devices[0].updateStatus(Status.Disabled)

    updateDevicesStatus(devices)

    expect(devices[0].status).toBe(Status.Disabled)
})

test('Get number of active players', () => {
    devices[0].type = 'player'
    devices[1].type = 'remote'

    expect(numberOfActivePlayers(devices)).toBe(0)
    
    devices[0].status = Status.OK

    expect(numberOfActivePlayers(devices)).toBe(1)
})