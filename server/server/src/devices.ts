import * as Sentry from "@sentry/node";

import { DateTime } from "luxon";
import { Status, DeviceStatus, Message, State } from "./models";

function updateDeviceLists(data: any, devices: Array<DeviceStatus>, unknown_devices: Array<DeviceStatus>) {
    // Update device list based on message
    let deviceUpdated = updateDevice(data, devices)

    // Unknown device, add to list of unknown devices
    if (!deviceUpdated) {
        // Try to update if in unknown devices
        if (!updateDevice(data, unknown_devices)) {
            // Otherwise add it
            let device = new DeviceStatus(data.name)
            device.update(data.type, data.locations, data.status, data.state)
            unknown_devices.push(device)
        }
    }
    // Update status of unknown devices
    updateDevicesStatus(unknown_devices)
    // Remove unknown devices that have not been seen for some time
    for (let device of unknown_devices) {
        if (device.status === Status.Warning)
            unknown_devices.splice(unknown_devices.indexOf(device), 1)
    }
}

/**
 * Update device list
 * @param data object received
 * @param devices list of devices
 * @return if device was found and updated
 */
function updateDevice(data: object, devices: Array<DeviceStatus>):boolean {
    let message = Object.assign(new Message(), data);

    if (message.name === undefined)
        return false;

    for (let device of devices) {
        if (device.name == message.name) {
            device.update(message.type, message.locations, message.status, message.state);
            return true
        }
    }

    return false
}

/**
 * Get number of devices per status
 * @param devices list
 * @returns object
 */
function aggregateDeviceStatus(devices: Array<DeviceStatus>) {
    let status = {
        ok: 0,
        warning: 0,
        failed: 0,
        disabled: 0
    }

    for (let device of devices) {
        switch(device.status) {
            case Status.OK:
                status.ok++
                break;
            case Status.Warning:
                status.warning++
                break;
            case Status.Failed:
                status.failed++
                break;
            case Status.Disabled:
                status.disabled++
                break;
        }
    }

    return status
}

function numberOfActivePlayers(devices: Array<DeviceStatus>):number {
    let count = 0

    for (let device of devices) {
        if (device.type === 'player' && device.status === Status.OK)
            count++
    }

    return count
}

/**
 * Change device status based on time since timestamp was updated
 * @param devices list
 */
function updateDevicesStatus(devices: Array<DeviceStatus>) {
    for (let device of devices) {
        if ((device.timestamp) && (device.status !== Status.Disabled)) {
            if ((DateTime.now() >= device.timestamp.plus({minutes: 10}))) {
                if (device.status !== Status.Failed)
                    Sentry.captureMessage(`Device failed. Name: ${device.name}, Type: ${device.type}`)

                device.updateStatus(Status.Failed)
            }
            else if ((DateTime.now() >= device.timestamp.plus({minutes: 2}))) {
                device.updateStatus(Status.Warning)
            }
            else {
                device.updateStatus(Status.OK)   
            }
        }
        if (device.state !== State.Playing)
            device.state = State.Waiting
    }
}

export { updateDeviceLists, updateDevice, aggregateDeviceStatus, numberOfActivePlayers, updateDevicesStatus }