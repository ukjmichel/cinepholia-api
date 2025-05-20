FROM node:23-slim

# Create app directory
WORKDIR /usr/src/app

# Install curl 
RUN apt update && apt install -y curl

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install dependencies
RUN npm install

RUN npm install -g pm2

# Bundle app source
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the port your app runs on
EXPOSE 3000

# Use PM2 runtime to start the built app directly
CMD [ "pm2-runtime", "dist/server.js" ]