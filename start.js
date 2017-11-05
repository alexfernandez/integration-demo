'use strict';

const http = require('http');
const {exec} = require('child_process')

function start() {
  const server = http.createServer((request, response) => {
    console.log('Received request for %s', request.url)
    exec('cd ~/test/ && git pull && npm test', (error, stdout) => {
      if (error) {
        console.error('Could not update: %s', error);
        response.writeHead(500, 'Not updated: ' + error);
        return
      }
      console.log('Updated: %s', stdout);
      response.end('Updated: ' + stdout);
    });
  });
  server.listen(8000, () => {
    console.log('Server listening');
  });
}

start();

