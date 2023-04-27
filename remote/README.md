# Gong Remote

Button to play gong and show if gong is playing.

To activate, hold for 5 seconds. Blinks faster until light stays on.

To disable, hold for 5 seconds. Blinks slower until light turns off.

## Environment variables

MQTT_SERVER: IP or hostname of the server running the MQTT broker

NAME: The device name

BUTTON_PIN: Where button is connected. Default 2

LED_PIN: Where LED is connected. Default 3

## Local mode development

If the device is set to local mode in balena cloud, push code to it like this:

    balena push <device_ip> --env MQTT_SERVER=<server_ip> --env NAME=<device_name>
    
    balena push 10.0.0.72 --env MQTT_SERVER=10.0.0.70 --env NAME=remote