import { getSdk } from 'balena-sdk';

const server_device_id = process.env.BALENA_DEVICE_UUID || process.env.SERVER_DEVICE_ID || ''
const token = process.env.API_KEY_BALENA || ''

const balena = getSdk({
    debug: true
});

async function balenaUpdateEnvironmentVariable(key: string, value: string) {
    let deviceId = server_device_id
    let service = 'server'

    if (server_device_id === '' || token === '')
        return

    await balena.auth.logout();
    await balena.auth.loginWithToken(token);

    await balena.models.device.serviceVar.set(deviceId, service, key, value).then(function() {
        console.log(`[balena] Updated '${key}' to '${value}'`);
    }).catch(function(err:any) {
        console.error(`[balena] Error while updating ${key}`, err);
    });
}

export { balenaUpdateEnvironmentVariable }