#!/bin/sh

# Replace the placeholder in tic_tac_toe.js with the value of PUBLIC_IP
sed -i "s#const baseUrl = 'http://localhost:8080';#const baseUrl = 'http://${PUBLIC_IP}';#g" tic_tac_toe.js

# Start the server
httpd -f -v -p 3000
