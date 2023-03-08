FROM node:lts-alpine as development

# change working directory
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

# Update NPM until Alpine image does it
RUN npm install -g npm@9.6.0

# run npm install in our local machine
RUN npm install

# Bundle app source
COPY . .

# Balena Audio
RUN apk add --no-cache alsa-plugins-pulse
# Install dependencies
RUN apk add --no-cache mpg123