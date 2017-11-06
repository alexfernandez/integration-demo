'use strict';

const http = require('http');
const ssh2 = require('ssh2');
const async = require('async');
const aws = require('aws-sdk');
const {exec} = require('child_process')

aws.config.loadFromPath('./.aws.json');

function start() {
  const server = http.createServer((request, response) => {
    console.log('Received request for %s', request.url)
    exec('cd ~/test/ && git pull && npm test', (error, stdout) => {
      if (error) {
        show(response, 'Could not update: %s', error);
        return response.end();
      }
      show(response, 'Updated: %s', stdout);
      getInstances((instances, error) => {
        if (error) {
          show(response, 'Could not get instances: %s', error);
          return response.end();
        }
        deploy(instances, (error, out) => {
          if (error) {
            show(response, 'Could not deploy: %s', error);
            return response.end();
          }
          show(response, 'Deployment worked: %s', out);
        });
      });
    });
  });
  server.listen(8000, () => {
    console.log('Server listening');
  });
}

function show(response, message, parameter) {
  if (parameter) {
    message = util.format(message, parameter);
  }
  console.log(message),
  response.write(message);
}

function getInstances(callback) {
  var ec2 = new aws.EC2();
  ec2.describeInstances({}, (error, data) => {
    if (error) return callback(error);
    const instances = [];
    data.Reservations.forEach(reservation => {
      reservation.Instances.forEach(instance => {
        if (instance.Tags[0].Value != 'integration') return;
        instances.push(instance);
      });
    });
    return callback(null, instances);
  });
}

function deploy(instances, callback) {
  const tasks = instances.map(instance => callback => {
    const client = new ssh2.Client();
    client.on('ready', () => {
      const buffers = [];
      client.exec('cd ~/test/ && git pull', (error, stream) => {
        if (error) return callback(error);
        stream.on('close', () => {
          client.end();
          return callback(null, Buffer.concat(buffers));
        });
        stream.on('data', data => {
          buffers.push(data);
        });
        stream.on('error', error => {
          buffers.push(error);
        });
      });
    }).connect({
      host: instance.PublicIpAddress,
      port: 22,
      username: 'ubuntu',
      privateKey: require('fs').readFileSync('../../.ssh/id_rsa'),
    });
  });
  async.series(tasks, (error, results) => {
    callback(error, results);
  });
}

getInstances((error, instances) => {
  console.log('{"e":"%s","i":%j}', error, instances);
  deploy(instances, (error, out) => {
    console.log('e %s out %s', error, out);
  });
});

//start();

