# Gong

A system for playing gong sounds in multiple locations at meditation centers. Running on multiple Raspberry Pis, managed using [balenaCloud](https://www.balena.io/cloud). Can play gong manually by pressing a button or automatically by fetching course schedule from dhamma.org.

![Build](https://github.com/Dhamma-Sobhana/gong/actions/workflows/server.node.js.yml/badge.svg) ![Open Issues](https://img.shields.io/github/issues/Dhamma-Sobhana/gong?style=flat&label=Issues) ![GitHub Release](https://img.shields.io/github/v/release/Dhamma-Sobhana/gong?label=Latest%20Release)

# Media

**Video: How to add a device**

[![Video: How to add a device](/img/video-setup.jpeg)](https://youtu.be/TO895aauBFo)

|System status on wall mounted tablet|Amplifier and Raspberry Pi player|
| --- | --- |
|![Wall mounted tablet](/img/tablet-wall.jpeg)|![Amplifier and Pi](/img/amplifier.jpeg)|


|Button for manually plaing gong|Raspberry Pis with DAC HATs|
| --- | --- |
![Remote](/img/remote.jpeg)|![Raspberry Pis](/img/raspberry-pis.jpeg)|

# Contact

If you are interested in obtaining support deploying this system or customizing it for your needs, please contact:

> [Marcus Götling](mailto:marcus@gotling.se?subject=Gong%20inquiry)

# Table of Contents
* [Device types](#device-types)
* [Architecture](#architecture)
* [Communication](#communication)
* [Configuration](#configuration)
* [Automation](#automation)
* [Manual execution](#manual-execution)
* [Web interface](#web-interface)
* [Development](#development)
* [Deployment](#deployment)
* [Attribution](#attribution)

# Device types

The system consists of 4 device types:

## Server

Has a [MQTT](https://mqtt.org/) server and contains logic for when and where gong should be played.

## Player

Using [balena audio block](https://github.com/balena-labs-projects/audio) for access to the audio hardware on the device and a nodejs service for playing sound to the audio block when a message is recieved from the server.

Connected to an amplifier with speakers.

## Remote

Has a button connected on [GPIO](https://projects.raspberrypi.org/en/projects/physical-computing/1) pins of the device. Sends a message to the server when the button is activated or inactivated. Shows current status of playing from the server using a LED.

## Status screen

A wall mounted tablet that shows upcoming gong, schedule, devices and system status. Allows system and automation to be disabled or enabled. Can act as a player to play gong.

# Architecture

## Code

Code running on node written in TypeScript.

## Containers

With the help of balena the application is running in [Docker containers](https://www.docker.com/resources/what-container/).

![Devices - Containers](/img/containers.png)

### Server

#### MQTT-Config
Configuration for the MQTT container.

#### MQTT
Prebuilt image with a MQTT server.

#### Server
The server logic. Communicates with players and remotes.

### Player

#### Audio
Prebuilt image by balena that handles audio playback. Sound data is sent to this container using a [pulse socket](https://wiki.archlinux.org/title/PulseAudio).

#### Player
The software that plays a sound file and ouputs the sound to the pulse socket for the audio container to pick up. Communicates with the server.

### Remote

#### Remote
Reads a GPIO pin for button presses and writes to a GPIO pin for giving feedback using a LED. Communicates with the server.

# Communication

MQTT message broker is used for communication between the different devices. If data is needed it is transmitted in JSON format.

Upon first run of the server MQTT configuration is generated based on the *MQTT_PASSWORD* configured on the server. MQTT is allowing anonymous readon-only connections but to write the device must connect using username ***mqtt** and the configured password.

> [!IMPORTANT]
> As the MQTT configuration is written on the first boot of the server, it might be needed to manually restart the MQTT server to have it read the configuration.

## Data

### Name
Name of device in lowercase and dashes instead of space.

Ending with a dash and the device type: -remote, -player

Configured with device variable *NAME* in *balenaCloud* dashboard.

Example names:

* main-house-remote
* main-house-player
* female-house-player
* male-house-player
* staff-house-player
* dhamma-hall-player

### Location
Which locations should be affected by a play message.

Configured with device variable *LOCATIONS* on a player in balenaCloud dashboard.

* all - Play everywhere. This should not be used in early mornings to not disturb neighbours by playing outside or waking up staff that are sleeping.
* student-accommodation - Speakers in student accommodation houses. Should be played every time.
* staff-accommodation - Speakers in staff accommodation houses. Should not be played in the early mornings.
* outside - Speakers mounted on the outside of the main house and the Dhamma hall. Should not be played in early mornings.

## Messages

### ping (server -> player, remote)
Request devices to send their status by publishing a *pong* message.

Published by the server once every 60 seconds.

### pong (player, remote -> server)
Send a message telling that the device is online. Sent when device has booted and as a response to *ping* message.

- name: string - Name of the device to easily identify it.
- locations: array of locations handled by the player. (player)
- type: string - Device type: remote, player
- status: string - optional - ok, warning, failed, disabled

Example data:

    {"name": "main-house-remote", "type": "remote", "status": "disabled"}
    {"name": "female-house-player", "locations": ["student-accommodation"], "type": "player"}
    {"name": "main-house-player", "locations": ["student-accommodation", "outside"], "type": "player"}

### play (server -> player)
Play gong sound if player is configured to handle the zone requested.

- type: string referring to sound type on player, usually 'gong'.
- locations: array of locations.
- repeat: number of times sound should be played.

Example data:

    { "type": "gong", "locations": ["all"], "repeat": 6 }
    { "type": "gong", "locations": ["student-accommodation"], "repeat": 6 }
    { "type": "gong", "locations": ["student-accommodation", "outside"], "repeat": 4 }

### playing (player -> server)
Report that playback has started.

- name: string - Name of the device.

Example data:

    {"name": "female-house-player"}

### played (player -> server)
Sent after gong has been played with this data:

- name: string. The name of the device.
- locations: array of locations player played in.

Example data:

    {"name": "female-house-player", "locations": ["student-accommodation"]}
    {"name": "main-house-player", "locations": ["student-accommodation", "outside"]}

### stop (server -> player, remote)
Stop playback and update state of remotes to show that gong is not playing anymore.

### activated (remote -> server)
Sent by remote when button has been pressed.

- name: string. Name of device that initiated the request.

Example data:

    {"name": "main-house-remote"}

### reload-ui (server -> server)
Sent when the data has been updated that requires the status display to reload.

# Configuration
Configuration is set using fleet or device variables in *balenaCloud* dashboard.

## AUDIO_VOLUME (player)
Maximum audio ouput volume of the audio block in percentage.

Default: `100`

## AUDIO_VOLUME_START (player)
Audio volume when starting playback.

Default: `50`

## PULSE_SERVER (player)
How player application and audio block communicates.

Default: `unix:/run/pulse/pulseaudio.socket`

## DISABLED (server, player, remote)
Set to true to make one device temporarly disabled. Will make any actions to have no effect.

Default: `false`

## MQTT_SERVER (player, remote)
IP address or hostname of server.

## MQTT_PASSWORD (server, player, remote)
Password for user _mqtt_ to connect to MQTT server.

## NAME (player, remote)
Name of the device, used for identification.

## LOCATIONS (player)
Comma separate locations this player handles.

Example: **student-accommodation,outside**

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

![Automation - Dhamma Location ID](/img/location-id.jpg)

## SENTRY_DSN (server)
Optional Data Source Name for error tracking using [Sentry](https://sentry.io/).

## PIN_CODE (server)
Optional numeric PIN code to access the web interface. Valid for 12 hours but extended on main screen reload to have tablet persistently logged in.

# Automation
The system can fetch a centers schedule for automatic plying of gong. Locally stored time table definitions are used to transform this data into a time table for playing gong.

## Time Table defintion
Files are stored in [`server/server/resources/timetable`](https://github.com/Dhamma-Sobhana/gong/tree/main/server/server/resources/timetable) in [JSON](https://www.json.org/json-en.html) format. File name is `<raw_course_type>.json` where *<raw_course_type>* is from the fetched schedule.

See [examples](#time-table-definition-examples) further down for full examples.

### Special files
There are two special time table definition files: `default.json` and `unknown.json`

*default.json* will be used for periods when no schedule is defined, for example between courses.

*unknown.json* will be used when schedule is defined but no definition exitst for that course type. This is currently set to not play any gongs at all.

### endTime (optional)

Format: `hh:mm`

What time on the last day the course finishes. If set, gong from the next course will not be scheduled before this time.

**Example**: A 10 day course followed by a service period. On day 11, the closing day, of a 10 day course morning wakeup gongs are played at 4:00 and 4:20 and a Service period has gong for morning group sitting at 7:20. If the 10 day course definition has *endTime* set to 09:00 the morning group sitting from the Service Period will be ignored and the next gong will be at 14:20.

Gongs on closing day of a 10 day course:
- 04:00
- 04:20
- 14:20
- 19:20

### days
An object with either `default` or course day numbers as key. Value is an array of time table entries, see below.

If no key with the current course day is found, default will be used.

**Example**:
```json
"0" : [],
"default" : [...]
"4": [...]
```

On day 0, the opening day, of a course no gongs will be played. On day 1-3 the default gongs for the course will be played. On day 4 the gong defined for day 4 will be played.

### time table entry

#### time

Format: `hh:mm`

What time gong should be played.

#### type
What type of gong sound to be played. Currently always set to `gong`.

#### location
An array of locations where the gong shoule be played. See [Location](#location).

#### repeat (optional)
How many times a gong should be played. If no value is defined the GONG_REPEAT value will be used.

**Example 1**:
```json
{ "time": "13:00", "type": "gong", "locations": ["student-accommodation", "outside"] }
```

**Example 2**:
```json
{ "time": "04:00", "type": "gong", "locations": ["student-accommodation"], "repeat": 8 }
```

### Time Table definition examples
#### 10-Day.json
```json
{
  "definition" : {
    "endTime": "08:50"
  },
  "days" : {
    "0" : [
      { "time": "07:20", "type": "gong", "locations": ["all"] },
      { "time": "12:50", "type": "gong", "locations": ["all"] }
    ],
    "default" : [
      { "time": "04:00", "type": "gong", "locations": ["student-accommodation"], "repeat": 8 },
      { "time": "04:20", "type": "gong", "locations": ["student-accommodation"], "repeat": 8 },
      { "time": "07:48", "type": "gong", "locations": ["all"] },
      { "time": "12:50", "type": "gong", "locations": ["student-accommodation", "outside"] },
      { "time": "14:15", "type": "gong", "locations": ["student-accommodation", "outside"] },
      { "time": "14:23", "type": "gong", "locations": ["all"] },
      { "time": "17:48", "type": "gong", "locations": ["all"] }
    ],
    "4" : [
      { "time": "04:00", "type": "gong", "locations": ["student-accommodation"], "repeat": 8 },
      { "time": "04:20", "type": "gong", "locations": ["student-accommodation"], "repeat": 8 },
      { "time": "07:48", "type": "gong", "locations": ["all"] },
      { "time": "12:50", "type": "gong", "locations": ["student-accommodation", "outside"] },
      { "time": "13:50", "type": "gong", "locations": ["all"] },
      { "time": "17:48", "type": "gong", "locations": ["all"] }
    ],
    "10" : [
      { "time": "04:00", "type": "gong", "locations": ["student-accommodation"], "repeat": 8 },
      { "time": "04:20", "type": "gong", "locations": ["student-accommodation"], "repeat": 8 },
      { "time": "07:48", "type": "gong", "locations": ["all"] },
      { "time": "14:20", "type": "gong", "locations": ["all"] },
      { "time": "15:55", "type": "gong", "locations": ["all"] },
      { "time": "17:48", "type": "gong", "locations": ["all"] }
    ],
    "11" : [
      { "time": "04:00", "type": "gong", "locations": ["student-accommodation"], "repeat": 8 },
      { "time": "04:20", "type": "gong", "locations": ["student-accommodation"], "repeat": 8 },
      { "time": "08:50", "type": "gong", "locations": ["all"] }
    ]
  }
}
```

#### ServicePeriod.json
```json
{
  "days": {
    "default": [
      { "time": "07:20", "type": "gong", "locations": ["all"] },
      { "time": "14:20", "type": "gong", "locations": ["all"] },
      { "time": "19:20", "type": "gong", "locations": ["all"] }
    ]
  }
}
```

# Manual execution
Playing of gong can be manually initiated by pressing the button on a *remote* device. Where the gong is played depending on what time of day the button is pressed is managed with configuration file [`server/server/resources/manual.json`](https://github.com/Dhamma-Sobhana/gong/tree/main/server/server/resources/manual.json).

## File defintion

### from

Format: `hh:mm`

From what time the configuration is starts.

### to

Format: `hh:mm`

Up to what time the configuration lasts.

### locations
An array of locations where the gong shoule be played. See [Location](#location).

### repeat (optional)
How many times a gong should be played. If no value is defined the *GONG_REPEAT* value will be used.

## Example
```json
[
    { "from": "03:45", "to": "06:15", "locations": ["student-accommodation"], "repeat": 8 },
    { "from": "06:15", "to": "22:00", "locations": ["all"] }
]
```

### Secenario 1: Executed at *03:44*.
Gong is not played anywhere as no period is handling that time.

### Secenario 2: Executed at *04:00*.
Gong is played only in *student-accommodation*, repeated 8 times.

### Secenario 3: Executed at *07:48*.
Gong is played everywhere, repeated according to server configuration.

### Secenario 4: Executed at *22:00*.
Gong is not played anywhere as no period is handling that time.

# Web interface
A web interface is hosted on the server device and is available to check system status and enabling or disabling system and automation. This interface is customized to be shown on a wall mounted tablet in landscape mode to give an overall system performance view at a glance.

> [!WARNING]
> Unless configuration PIN_CODE is set on the server this interface will be open to any device in the local network.

## Overview

Gives at a glance view of the overall system performance. Shows next gong coming up and if all parts of the system are working correctly.

![Overview](/img/overview.jpeg)

## Schedule

Shows upcoming schedule for today and tomorrow and upcoming courses. Link to print full upcoming schedule.

![Schedule](/img/schedule.jpeg)

## Devices

List all devices that should be online for system to be fully functional and when they last was in contact with the server.

If unknonwn devices are connected they are listed here as well.

![Devices](/img/devices.jpeg)

## System Status

Gives more detailed information about the status of different parts of the system. Shows the last activity logged on the server. 

![System status](/img/system-status.jpeg)

## Settings

Allow system and automation to be turned on and off.

> [!IMPORTANT]
> When disabling or enabling system or automation, the updated configuration will be pushed to balenaCloud which will restart the server container. This might cause the web ui to not be available for a short time.

![Settings](/img/settings.jpeg)

### Local play

The wall mounted tablet can also act as a player. Set the location the device should simulate and how many times the gong should be repeated.

> [!IMPORTANT]
> For this to work properly the web ui must be running in a browser which allows automatic playback of audio without user interaction. In Android Lockdown this is done by enabling *Auto Play HTML5 Audio* in *Page & Content*.

![Local play](/img/local-play.jpeg)

### Testing

For help when installing the system a sound can be repeatedly played on a device. This can help with finding the optimal placement of speakers.

Select which device to test and which sound type to play. Silence can be useful to test that the device is responding correctly wihtout causing any disturbance.

![Testing](/img/test.jpeg)

# Development

For running the project using docker on the developement machine:

    docker-compose -f docker-compose.development.yml up --build

For running all services on a single device in local mode using *balenaCloud*:

    balena push <device_ip>

Or to run all services on a single device deployed to **gong/development** on *balenaCloud*:

    balena push gong/development

# Deployment

Deployment to *balenaCloud* and devices is done from subfolders for each device type.

## Server

    cd server
    balena push gong/server

## Player

    cd player
    balena push gong/player

## Remote

    cd remote
    balena push gong/remote


# Attribution

Status icons:

<a href="https://www.freepik.com/icon/alert_15483855">Generic Others by pocike</a>

Application icon:

<a href="https://www.flaticon.com/free-icons/gong">Gong icon by Pixel perfect</a>
