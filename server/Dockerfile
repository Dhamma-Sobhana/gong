FROM node:lts-alpine as base

# change working directory
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

# run npm install in our local machine
RUN npm install

# Bundle app source
COPY . .

# Building for production
FROM base as production

ENV NODE_PATH=./build

RUN npm run build