# Use a specific Node.js version with Yarn pre-installed
FROM node:16

# Set working directory
WORKDIR /app

# Copy project files into the container
COPY . /app

# Install dependencies (including devDependencies)
RUN yarn install --frozen-lockfile --production=false

# Build the application
RUN yarn build

# Expose the necessary port (e.g., 8080)
EXPOSE 8080

# Start the application
CMD ["yarn", "start"]
