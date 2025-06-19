# Stage 1: Build Environment
# Using a specific Node.js LTS version on Alpine for a smaller base image.
FROM node:current-bullseye-slim AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker layer caching.
# This ensures npm install is only run if these files change.
COPY ./node/package*.json  ./

# Install production dependencies. Using npm ci for reproducible builds.
# The --only=production flag ensures dev dependencies are not installed,
# reducing the size of node_modules, though for the builder stage it's less critical
# if you have a build step (e.g., Babel, Webpack, TypeScript compilation).
# If your app requires dev dependencies for a build step (e.g., `npm run build`),
# remove `--only=production` here.
RUN npm ci --only=production

# Copy the rest of the application code
COPY ./node .

# If you have a build step (e.g., transpiling TypeScript, bundling assets),
# uncomment and adjust the following line.
# Example: RUN npm run build

# Stage 2: Production Environment
# Use a minimal Node.js Alpine image for the final runtime.
FROM node:current-bullseye-slim AS production

# Set the working directory
WORKDIR /app

# Copy only the necessary files from the builder stage:
# - package.json and package-lock.json for accurate dependency resolution (optional, but good practice)
# - node_modules (already installed in the builder stage)
# - The application code itself
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app .

# Expose the port your Node.js application listens on.
# Replace 8080 with your application's actual port if different.
EXPOSE 8080

# Command to run the application when the container starts.
# Replace 'server.js' with your main application entry file (e.g., 'app.js', 'index.js').
CMD ["npm", "start"]

