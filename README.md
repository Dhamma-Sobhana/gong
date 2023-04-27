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

Code is written in nodejs using TypeScript.

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

MQTT message broker is used for communication between the different devices.

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