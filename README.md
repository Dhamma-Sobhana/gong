# Gong

A system for playing gong sounds in multiple locations at meditation centers. Managed using [balenaCloud](https://www.balena.io/cloud). Can play manually by pressing a button or automatically by fetching course schedule from dhamma.org.

![Server CI](https://github.com/Dhamma-Sobhana/gong/actions/workflows/server.node.js.yml/badge.svg)

# Videos

[![How to add a device](https://img.youtube.com/vi/TO895aauBFo/default.jpg)](https://youtu.be/TO895aauBFo)

# Table of Contents
* [Device types](#device-types)
* [Architecture](#architecture)
* [Communication](#communication)
* [Configuration](#configuration)
* [Automation](#automation)
* [Web interface](#web-interface)
* [Development](#development)
* [Deployment](#deployment)

# Device types

The system consists of 3 device types:

## Server

Has a [MQTT](https://mqtt.org/) server and contains logic for when and where gong should be played.

## Player

Using [balena audio block](https://github.com/balena-labs-projects/audio) for access to the audio hardware on the device and a nodejs service for playing sound to the audio block when a message is recieved from the server.

Connected to an amplifier with speakers.

## Remote

Has a button connected on [GPIO](https://projects.raspberrypi.org/en/projects/physical-computing/1) pins of the device. Sends a message to the server when the button is activated or inactivated. Shows current status of playing from the server using a LED.

# Architecture

## Code

Code will be written in nodejs using TypeScript. Some existing code is for now just JavaScript.

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

MQTT message broker is used for communication between the different devices. If data is needed it is in JSON format.

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

## DISABLED (player, remote)
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

## MORNING_TIME (server)
Time in format `hh:mm`.

If server recieves an *activated* message from a remote before this time, only play in zone **student-accommodation**.

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
{ "time": "13:00", "type": "gong", "location": ["student-accommodation", "outside"] }
```

**Example 2**:
```json
{ "time": "04:00", "type": "gong", "location": ["student-accommodation"], "repeat": 8 }
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
      { "time": "07:20", "type": "gong", "location": ["all"] },
      { "time": "12:50", "type": "gong", "location": ["all"] }
    ],
    "default" : [
      { "time": "04:00", "type": "gong", "location": ["student-accommodation"], "repeat": 8 },
      { "time": "04:20", "type": "gong", "location": ["student-accommodation"], "repeat": 8 },
      { "time": "07:48", "type": "gong", "location": ["all"] },
      { "time": "12:50", "type": "gong", "location": ["student-accommodation", "outside"] },
      { "time": "14:15", "type": "gong", "location": ["student-accommodation", "outside"] },
      { "time": "14:23", "type": "gong", "location": ["all"] },
      { "time": "17:48", "type": "gong", "location": ["all"] }
    ],
    "4" : [
      { "time": "04:00", "type": "gong", "location": ["student-accommodation"], "repeat": 8 },
      { "time": "04:20", "type": "gong", "location": ["student-accommodation"], "repeat": 8 },
      { "time": "07:48", "type": "gong", "location": ["all"] },
      { "time": "12:50", "type": "gong", "location": ["student-accommodation", "outside"] },
      { "time": "13:50", "type": "gong", "location": ["all"] },
      { "time": "17:48", "type": "gong", "location": ["all"] }
    ],
    "10" : [
      { "time": "04:00", "type": "gong", "location": ["student-accommodation"], "repeat": 8 },
      { "time": "04:20", "type": "gong", "location": ["student-accommodation"], "repeat": 8 },
      { "time": "07:48", "type": "gong", "location": ["all"] },
      { "time": "14:20", "type": "gong", "location": ["all"] },
      { "time": "15:55", "type": "gong", "location": ["all"] },
      { "time": "17:48", "type": "gong", "location": ["all"] }
    ],
    "11" : [
      { "time": "04:00", "type": "gong", "location": ["student-accommodation"], "repeat": 8 },
      { "time": "04:20", "type": "gong", "location": ["student-accommodation"], "repeat": 8 },
      { "time": "08:50", "type": "gong", "location": ["all"] }
    ]
  }
}
```

#### ServicePeriod.json
```json
{
  "days": {
    "default": [
      { "time": "07:20", "type": "gong", "location": ["all"] },
      { "time": "14:20", "type": "gong", "location": ["all"] },
      { "time": "19:20", "type": "gong", "location": ["all"] }
    ]
  }
}
```

# Web interface
A basic web interface is hosted on the server device and available to check system status and enabling or disabling system and automation.

|![Web - System status](/img/system-status.jpg)|![Web - Automation](/img/automation.jpg)|
|:-:|:-:|
|Overview of system status telling which parts are anabled and if all devices are online.|Allows automation to be turned on or off. Shows upcoming schedule for today and tomorrow and when next gong will be played.|
|![Web - Devices](/img/devices.jpg)|![Web - Log](/img/log.jpg)|
|List all devices that should be online for system to be fully functional and when they last was in contact with the server.|Shows the last activity logged on the server.|

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
