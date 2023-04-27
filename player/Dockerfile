FROM balenalib/armv7hf-alpine-node:18.12-3.17-run as development

# change working directory
WORKDIR /usr/src/app

# Balena Audio
# Install dependencies
RUN apk add --no-cache alsa-plugins-pulse mpg123

# Update NPM until Alpine image does it
#RUN npm install -g npm@9.6.3

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

RUN JOBS=MAX npm config set update-notifier false && npm install --omit=dev --unsafe-perm && npm cache verify && rm -rf /tmp/*

# Bundle app source
COPY . .