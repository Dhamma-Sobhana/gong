# Gong Player

A device connected to an amplifier with speakers that plays gong when told to by server.

# Dependencies

- mpg123: For playing sound
- mqtt server: For communication with backend

# Developement

    npm install
    npm run start-nodemon

## Local mode development

If the device is set to local mode in balena cloud, push code to it like this:

    balena push <device_ip> --env MQTT_SERVER=<server_ip> --env NAME=<device_name> --env PULSE_SERVER=unix:/run/pulse/pulseaudio.socket --env AUDIO_VOLUME=100
    
    balena push 10.0.0.71 --env MQTT_SERVER=10.0.0.70 --env NAME=player --env PULSE_SERVER=unix:/run/pulse/pulseaudio.socket --env AUDIO_VOLUME=100

# Configuration
See README in root for detailed explaination.

## NAME
The device name.

Example: **female-house-player**

## ZONES
Array of zones this player handles.

Example: **["accommodation", "outside"]**

## MQTT_SERVER
IP or hostname of MQTT server.

### AUDIO_VOLUME
Maximum audio ouput volume of the audio block in percentage.

Default: `100`

## AUDIO_VOLUME_START
Audio volume when starting playback.

Default: `50`

### PULSE_SERVER
How player application and audio block communicates.

Default: `unix:/run/pulse/pulseaudio.socket`

# Communication

Service connects to MQTT message broker and subscribes to topics.

See README in root for detail of messages.

# Optional hardware

To prevent static noise from speakers a relay can be used to keep the circuit open when not playing.

If using a device with GPIO a simple relay can be connected to this.

This can also be used to handle more than one area using one device by opening circuits based on zones received.

