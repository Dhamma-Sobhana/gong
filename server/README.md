# Gong Server

Logic for playing gong and monitoring of gong devices.

# Environment variables
See README in root for detailed explaination.

## DEVICES (server)
Comma separated list of devices that should be online. Used to check status of devices.

# Local mode development

If the device is set to local mode in balena cloud, push code to it like this:

    balena push <device_ip> --env DEVICES=<devices,list>
    
    balena push 10.0.0.70 --env DEVICES=remote,player,unknown