FROM balenalib/armv7hf-alpine-node:16.19.1-3.17-run AS base

# Balena Audio
# Install dependencies
RUN apk add --no-cache alsa-plugins-pulse mpg123

FROM base AS development

# change working directory
WORKDIR /usr/src/app

# copy the package.json files from local machine to the workdir in container
COPY package*.json ./

# run npm install in our local machine
RUN npm config set update-notifier false && npm install

#nodev-cmd-live=node node_modules/nodemon/bin/nodemon.js src/main.ts

# bundle app source
COPY . .

# run nodemon
RUN npm run build

## Added for development and commented out rest
CMD ["npm", "run", "start"]


# # Building for production
# FROM base AS production

# # change working directory
# WORKDIR /usr/src/app

# # copy the package.json files from local machine to the workdir in container
# COPY package*.json ./

# ARG NODE_ENV=production
# ENV NODE_ENV=${NODE_ENV}

# COPY --from=development /usr/src/app/build ./build
# COPY --from=development /usr/src/app/sound ./sound

# RUN npm config set update-notifier false &&  npm ci --omit=dev

# CMD ["npm", "run", "start"]