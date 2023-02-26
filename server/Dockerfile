FROM node:lts-alpine

# change working directory
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

# run npm install in our local machine
RUN npm install

# Bundle app source
COPY . .

# the command that starts our app
CMD ["node", "src/server.js"]