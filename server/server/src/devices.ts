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
            device.update(message.type, message.zones);
        }
    }
}

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

function updateDevicesStatus(devices: Array<DeviceStatus>) {
    for (let device of devices) {
        if (device.timestamp) {
            if ((DateTime.now() >= device.timestamp.plus({minutes: 60})))
                device.updateStatus(Status.Failed)
            else if ((DateTime.now() >= device.timestamp.plus({minutes: 10})))
                device.updateStatus(Status.Warning)
            else if ((DateTime.now() < device.timestamp.plus({minutes: 10})))
                device.updateStatus(Status.OK)   
        }
    }
}

export { updateDevice, aggregateDeviceStatus, updateDevicesStatus }