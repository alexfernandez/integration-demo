'use strict';

const http = require('http');
const {exec} = require('child_process')

function start() {
  const server = http.createServer((request, response) => {
    console.log('Received request for %s', request.url)
    exec('cd ~/test/ && git pull', (error, stdout) => {
      if (error) return console.error('Could not update: %s', error);
      console.log('Updated: %s', stdout);
    });
  });
  server.listen(8000, () => {
    console.log('Server listening');
  });
}

start();

