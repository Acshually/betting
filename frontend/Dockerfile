FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install EVERYTHING including devDependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Force set the path to the node_modules bin
ENV PATH /app/node_modules/.bin:$PATH

EXPOSE 3000

CMD ["npm", "start"]