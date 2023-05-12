# Gong

System for playing gong sounds in multiple locations. Managed using [balenaCloud](https://www.balena.io/cloud).

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

## Communication

MQTT message broker is used for communication between the different devices. If data is needed it is in JSON format.

### Data

#### Name
Name of device in lowercase and dashes instead of space.

Ending with a dash and the device type: -remote, -player

Configured with device variable *NAME* in balenaCloud dashboard.

Example names:

* main-house-remote
* main-house-player
* female-house-player
* male-house-player
* server-house-player
* dhamma-hall-player

#### Zone
Which zones should be affected by a play message.

Configured with device variable *ZONES* in balenaCloud dashboard.

* all - Play everywhere. This should not be used in early mornings to not disturb neighbours by playing outside or waking up servers that are sleeping.
* accommodation - All the accommodation houses. Should be played every time.
* outside - Speakers mounted on the outside of the main house and the Dhamma hall. Should not be played in early mornings.
* servers - Speakers in the server house. Should not be played in the early mornings and preferably not when only students should meditate.

### Messages

#### ping (global)
Request devices to send their status by publishing a *pong* message.

#### pong (global)
Send message telling that the device is online.

- name: string - Name of the device to easily identify it.
- zones: array of zones handled by the player. (player)

Example data:

    {"name": "main-house-remote"}
    {"name": "female-house-player", "zones": ["accommodation"]}

#### play (player)
Wait until the next even second, then play gong sound.

- zones: array of zones.

Example data:

    {"zones": ["all"]}
    {"zones": ["accommodation", "outside"]}

#### played (player)
Publish after gong has been played with this data:

- name: string. The name of the device.
- zones: array of zones player played in.

Example data:

    {"name": "female-house-player", "zones": ["accommodation"]}
    {"name": "main-house-player", "zones": ["accommodation", "outside"]}

#### stop (player, remote)
Stop playback and update state of remote to show that gong is not playing anymore.

#### activated (remote)
Sent by remote when button has been pressed.

- name: string. Name of device that initiated the request.

Example data:

    {"name": ["main-house-remote"]}

## Configuration
Configuration is set using fleet or device variables in balenaCloud dashboard.

### AUDIO_VOLUME (player)
Audio ouput volume of the audio block.

For maximal volume: `100`

### PULSE_SERVER (player)
How player application and audio block communicates.

Always set to: `unix:/run/pulse/pulseaudio.socket`

### MQTT_SERVER (player, remote)
IP address or hostname of server.

### NAME (player, remote)
Name of device.

### ZONES (player)
Array of zones the player handles.

### MORNING_TIME (server)
Time in format hh:mm

If server recieves an *activated* message from remote before this time, only play in zone **accommodation**.

## Development

For running the project using docker on the developement machine:

    docker-compose -f docker-compose.development.yml up --build

For running all services on a single device in local mode using belanaCloud:

    balena push <device_ip> --env MQTT_SERVER=<server_ip> --env NAME=<device_name>

## Deployment

Deployment to balena and devices is done from subfolders for each device type.

### Server

    cd server
    balena push gong/server

### Player

    cd player
    balena push gong/player

### Remote

    cd remote
    balena push gong/remote