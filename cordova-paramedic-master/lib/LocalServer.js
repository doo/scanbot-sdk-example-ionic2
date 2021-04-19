/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

const Q = require('q');
const io = require('socket.io');
const portChecker = require('tcp-port-used');
const { EventEmitter } = require('events');
const localtunnel = require('localtunnel');
const shell = require('shelljs');
const { spawn } = require('child_process');
const { logger, execPromise, utilities } = require('./utils');

// how many ms without a pong packet to consider the connection closed
const CONNECTION_HEARBEAT_PING_TIMEOUT = 60000;
// how many ms before sending a new ping packet
const CONNECTION_HEARBEAT_PING_INTERVAL = 25000;

class LocalServer extends EventEmitter {
    constructor (port, externalServerUrl) {
        super();

        this.port = port;
        this.externalServerUrl = externalServerUrl;
        this.server = { alive: false };
    }

    cleanUp () {
        logger.normal('local-server: killing local file transfer server if it\'s up...');
        if (this.server.alive) {
            this.server.alive = false;
            this.server.process.kill('SIGKILL');
        }
    }

    startFileTransferServer (tempPath) {
        process.on('uncaughtException', () => {
            if (this.exiting) return;
            this.exiting = true;
            this.cleanUp();
        });

        return Q().then(() => {
            shell.pushd(tempPath);
            logger.normal('local-server: cloning file transfer server');
            return execPromise('git clone https://github.com/apache/cordova-labs --branch cordova-filetransfer');
        }).then(() => {
            shell.pushd('cordova-labs');
            logger.normal('local-server: installing local file transfer server');
            return execPromise('npm i');
        }).then(() => {
            logger.normal('local-server: starting local file transfer server');
            this.server.process = spawn('node', [ 'server.js' ]);
            this.server.alive = true;

            logger.info('local-server: local file transfer server started');
            shell.popd();
            shell.popd();
            return this.server;
        });
    }

    createTunnel () {
        logger.info('cordova-paramedic: attempt to create local tunnel');

        return Q.Promise((resolve, reject) => {

            const tunnel = localtunnel(this.port, (err, tunnel) => {
                if (err) {
                    reject('Unable to create local tunnel: ' + err);
                    return;
                }

                this.tunneledUrl = tunnel.url;
                logger.info('cordova-paramedic: using tunneled url ' + this.tunneledUrl);

                resolve(this);
            });

            // this trace is useful to debug test run timeout issue
            tunnel.on('close', function () {
                logger.normal('local-server: local tunnel has been closed');
            });
        });
    }

    createSocketListener () {
        const listener = io.listen(this.port, {
            pingTimeout: CONNECTION_HEARBEAT_PING_TIMEOUT,
            pingInterval: CONNECTION_HEARBEAT_PING_INTERVAL
        });

        listener.on('connection', (socket) => {
            logger.info('local-server: new socket connection');
            this.connection = socket;

            // server methods
            [
                'deviceLog',
                'disconnect',
                'deviceInfo',
                'jasmineStarted',
                'specStarted',
                'specDone',
                'suiteStarted',
                'suiteDone',
                'jasmineDone'
            ].forEach((route) => {
                socket.on(route, (data) => {
                    this.emit(route, data);
                });
            });
        });
    }

    // Connection address could be platform specific so we pass platform as param here
    getConnectionAddress (platformId) {
        if (this.externalServerUrl) return this.externalServerUrl;

        // build connection uri for localhost based on platform
        return platformId === utilities.ANDROID
            ? 'http://10.0.2.2' // TODO This only seems to work sometimes. See PR #56
            : 'http://127.0.0.1';
    }

    // Connection url could be platform specific so we pass platform as param here
    getConnectionUrl (platformId) {
        // --useTunnel option
        if (this.tunneledUrl) return this.tunneledUrl;

        return this.getConnectionAddress(platformId) + ':' + this.port;
    }

    isDeviceConnected () {
        return !!this.connection;
    }
}

function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

LocalServer.startServer = function (ports, externalServerUrl, useTunnel, noListener) {

    logger.warn('------------------------------------------------------------');
    logger.warn('2. Create and configure local server to receive test results');
    logger.warn('------------------------------------------------------------');

    logger.normal('local-server: scanning ports from ' + ports.start + ' to ' + ports.end);

    return LocalServer.getAvailablePort(ports.start, ports.end)
        .then((port) => {
            logger.normal('local-server: port ' + port + ' is available');
            logger.info('local-server: starting local medic server');

            const localServer = new LocalServer(port, externalServerUrl);

            if (!noListener) localServer.createSocketListener();
            if (useTunnel) return localServer.createTunnel();

            return localServer;
        });
};

LocalServer.getAvailablePort = function (startPort, endPort) {
    const port = getRandomInt(startPort, endPort);
    return portChecker.check(port)
        .then((isInUse) => {
            if (!isInUse) return port;
            if (startPort < endPort) return LocalServer.getAvailablePort(startPort, endPort);
            throw new Error('Unable to find available port');
        });
};

module.exports = LocalServer;
