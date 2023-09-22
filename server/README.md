# Gong Server

Logic for playing gong and monitoring of gong devices.

# Environment variables
See README in root for detailed explaination.

## MORNING_TIME (server)
Time in format `hh:mm`.

If server recieves an *activated* message from a remote before this time, only play in zone **student-accommodation**.

## DEVICES (server)
Comma separated list of devices that should be online. Used to check status of devices.

## GONG_REPEAT (server)
How many times a gong should be played in a row.

## AUTOMATION (server)
If automatic fetching and parsing of courses from dhamma.org site should be used.

Default: `false`

## LOCATION_ID (server)
If automation is enabled, id of location to fetch courses for.

Find by going to [Locations, Worldwide Directory](https://www.dhamma.org/en/locations/directory) and expand a center location, choose to use developer tools to inspect the location and find the `data-id` property.

Format: `nnnn`

# Local mode development

If the device is set to local mode in balena cloud, push code to it like this:

    balena push <device_ip> --env DEVICES=<devices,list> --env LOCATION_ID=<id> --env AUTOMATION=<true/false>
    
    balena push 10.0.0.70 --env DEVICES=remote,player --env LOCATION_ID=1392 --env AUTOMATION=true