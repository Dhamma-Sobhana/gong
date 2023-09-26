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

    balena push <device_ip> --env MQTT_SERVER=<server_ip> --env NAME=<device_name>
    
    balena push 10.0.0.71 --env MQTT_SERVER=10.0.0.70 --env NAME=player

# Configuration
See README in root for detailed explaination.

## NAME
The device name.

Example: **female-house-player**

## LOCATIONS
Comma separate locations this player handles.

Example: **student-accommodation,outside**

## MQTT_SERVER
IP or hostname of MQTT server.

## AUDIO_VOLUME
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

## GPIO relay **To be done**

To prevent static noise from speakers a relay can be used to keep the circuit open when not playing.

If using a device with GPIO a simple relay can be connected to this.

This can also be used to handle more than one area using one device by opening circuits based on locations received.

## DAC (digital-to-analogue converter)

Raspberry Pi has a builtin 3.5 mm audio output. To incresae audio quality and volume a DAC HAT (hardware attached on top) can be attached to the GPIO pins of the Raspberry Pi. This will add a RCA connector that can be used to connect an amplifier.