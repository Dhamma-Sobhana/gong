# Gong Server

Logic for playing gong and monitoring of gong devices.

# Environment variables
See README in root for detailed explaination.

## DEVICES (server)
Comma separated list of devices that should be online. Used to check status of devices.

## GONG_REPEAT (server)
How many times a gong should be played in a row by default. Time table entries can override this value.

## AUTOMATION (server)
If automatic fetching and parsing of courses from dhamma.org site should be used.

Default: `false`

## LOCATION_ID (server)
If automation is enabled, id of location to fetch courses for.

Find by going to [Locations, Worldwide Directory](https://www.dhamma.org/en/locations/directory) and expand a center location, choose to use developer tools to inspect the location and find the `data-id` property.

Format: `nnnn`

## SENTRY_DSN (server)
Optional Data Source Name for error tracking using [Sentry](https://sentry.io/).

## PIN_CODE (server)
Optional numeric PIN code to access the web interface. Valid for 12 hours but extended on main screen reload to have tablet persistently logged in.

# Local mode development

If the device is set to local mode in balena cloud, push code to it like this:

    balena push <device_ip> --env DEVICES=<devices,list> --env LOCATION_ID=<id> --env AUTOMATION=<true/false> --env NODE_ENV=development
    
    balena push 10.0.0.70 --env DEVICES=remote,player --env LOCATION_ID=1392 --env AUTOMATION=true --env NODE_ENV=development