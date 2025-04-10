cp mosquitto.conf /mosquitto/config
cp acl_file /mosquitto/config
./mosquitto_passwd -b /mosquitto/config/password_file mqtt $MQTT_PASSWORD