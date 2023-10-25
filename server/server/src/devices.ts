import * as Sentry from "@sentry/node";

import { DateTime } from "luxon";
import { Status, DeviceStatus, Message } from "./models";

/**
 * Update device list
 * @param data object received
 * @param devices list of devices
 */
function updateDevice(data: object, devices: Array<DeviceStatus>) {
    let message = Object.assign(new Message(), data);

    if (message.name === undefined)
        return;

    for (let device of devices) {
        if (device.name == message.name) {
            device.update(message.type, message.locations);
        }
    }
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
        failed: 0
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
            
        }
    }

    return status
}

/**
 * Change device status based on time since timestamp was updated
 * @param devices list
 */
function updateDevicesStatus(devices: Array<DeviceStatus>) {
    for (let device of devices) {
        if (device.timestamp) {
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
    }
}

export { updateDevice, aggregateDeviceStatus, updateDevicesStatus }