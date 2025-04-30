cp mosquitto.conf /mosquitto/config
cp acl_file /mosquitto/config
cp password_file /mosquitto/config
chmod 0700 /mosquitto/config/password_file
./mosquitto_passwd -b /mosquitto/config/password_file mqtt $MQTT_PASSWORD