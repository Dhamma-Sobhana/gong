# Gong

System for playing gong sounds in multiple locations. Managed using balenaCloud.

# Device types

The system consists of 3 device types.

## Server

Has a MQTT server and contains logic for when and where gong should be played.

## Player

Using balena block audio for access to audio hardware on the device and a service for receiving messages from the server.

Contected to amplifier with speakers.

## Remote

Has a button connected on GPIO pins. Sends message to server when button activated or inactivated. Shows current status of playing from server using LED.

## Development

For running the project using docker on the developement machine:

    docker-compose -f docker-compose.development.yml up --build

For running all services on a single device in local mode using belanaCloud:

    balena push <ip>

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