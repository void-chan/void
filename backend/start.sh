#!/bin/sh
# Run migrations + seed admin on every start (seed skips if admin already exists)
node src/utils/seed.js
# Start the server
exec node src/server.js
