# Gong

A system for playing gong sounds in multiple locations at meditation centers. Managed using [balenaCloud](https://www.balena.io/cloud).

![Server CI](https://github.com/Dhamma-Sobhana/gong/actions/workflows/server.node.js.yml/badge.svg)

# Table of Contents
* [Device types](#device-types)
* [Architecture](#architecture)
* [Communication](#communication)
* [Configuration](#configuration)
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

### Zone
Which zones should be affected by a play message.

Configured with device variable *ZONES* in balenaCloud dashboard.

* all - Play everywhere. This should not be used in early mornings to not disturb neighbours by playing outside or waking up staff that are sleeping.
* student-accommodation - Speakers in student accommodation houses. Should be played every time.
* staff-accommodation - Speakers in staff accommodation houses. Should not be played in the early mornings.
* outside - Speakers mounted on the outside of the main house and the Dhamma hall. Should not be played in early mornings.

## Messages

### ping (server -> player, remote)
Request devices to send their status by publishing a *pong* message.

### pong (player, remote -> server)
Send a message telling that the device is online. Sent when device has booted and as a response to *ping* message.

- name: string - Name of the device to easily identify it.
- zones: array of zones handled by the player. (player)
- type: string - Device type: remote, player

Example data:

    {"name": "main-house-remote", "type": "remote"}
    {"name": "female-house-player", "zones": ["student-accommodation"], "type": "player"}
    {"name": "main-house-player", "zones": ["student-accommodation", "outside"], "type": "player"}

### play (server -> player)
Play gong sound if player is configured to handle the zone requested.

- zones: array of zones.
- repeat: number of times sound should be played.

Example data:

    {"zones": ["all"], repeat: 6}
    {"zones": ["student-accommodation"], repeat: 6}
    {"zones": ["student-accommodation", "outside"], repeat: 4}

### playing (player -> server)
Report that playback has started.

- name: string - Name of the device.

Example data:

    {"name": "female-house-player"}

### played (player -> server)
Sent after gong has been played with this data:

- name: string. The name of the device.
- zones: array of zones player played in.

Example data:

    {"name": "female-house-player", "zones": ["student-accommodation"]}
    {"name": "main-house-player", "zones": ["student-accommodation", "outside"]}

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

## MQTT_SERVER (player, remote)
IP address or hostname of server.

## NAME (player, remote)
Name of the device, used for identification.

## ZONES (player)
Comma separated list of zones the player handles.

## MORNING_TIME (server)
Time in format `hh:mm`.

If server recieves an *activated* message from a remote before this time, only play in zone **student-accommodation**.

## DEVICES (server)
Comma separated list of devices that should be online. Used to check status of devices.

## GONG_REPEAT (server)
How many times a gong should be played in a row.

# Development

For running the project using docker on the developement machine:

    docker-compose -f docker-compose.development.yml up --build

For running all services on a single device in local mode using belanaCloud:

    balena push <device_ip> --env MQTT_SERVER=<server_ip> --env NAME=<device_name>

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
