# Gong Remote

Button to play gong and show if gong is playing.

To activate, hold for 2 seconds. Blinks faster until light stays on and message is sent.

To disable, press once. Message is sent directly.

## Environment variables
See README in root for detailed explaination.

### MQTT_SERVER
IP or hostname of the server running the MQTT broker.

### NAME
The device name.

Example: **main-house-remote**

### BUTTON_PIN
GPIO pin the button is connected to.

Default: **2**

### LED_PIN
GPIO pin the LED is connected to.

Default: **3**

## Local mode development

If the device is set to local mode in balena cloud, push code to it like this:

    balena push <device_ip> --env MQTT_SERVER=<server_ip> --env NAME=<device_name> --env NODE_ENV=development
    
    balena push 10.0.0.72 --env MQTT_SERVER=10.0.0.70 --env NAME=remote --env NODE_ENV=development