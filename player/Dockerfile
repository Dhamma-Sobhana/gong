FROM node:lts-alpine as development

# change working directory
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

# run npm install in our local machine
RUN npm install

# Bundle app source
COPY . .

# Install dependencies
RUN apk add --no-cache mpg123