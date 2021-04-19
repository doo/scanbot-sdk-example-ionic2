#!/usr/bin/env node

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

const shelljs = require('shelljs');
const { logger, exec, utilities } = require('./utils');

class ParamedicKill {
    constructor (platform) {
        this.platform = platform;
    }

    kill () {
        // shell config
        shelljs.config.fatal = false;
        shelljs.config.silent = false;

        // get platform tasks
        const platformTasks = this.tasksOnPlatform(this.platform);

        if (platformTasks.length < 1) {
            console.warn('No known tasks to kill');
            return;
        }

        // kill them
        this.killTasks(platformTasks);

        if (this.platform === utilities.ANDROID) this.killAdbServer();
    }

    tasksOnPlatform (platformName) {
        let tasks = [];

        switch (platformName) {
        case utilities.WINDOWS:
            tasks = ['WWAHost.exe', 'Xde.exe'];
            break;

        case utilities.IOS:
            tasks = ['Simulator', 'iOS Simulator'];
            break;

        case utilities.ANDROID:
            tasks = utilities.isWindows()
                ? ['emulator-arm.exe', 'qemu-system-i386.exe']
                : ['emulator64-x86', 'emulator64-arm', 'qemu-system-i386', 'qemu-system-x86_64'];
            break;

        case utilities.BROWSER:
            tasks = utilities.isWindows()
                ? ['chrome.exe']
                : ['chrome'];
            break;
        }

        return tasks;
    }

    killTasks (taskNames) {
        if (!taskNames || taskNames.length < 1) return;

        const command = this.getKillCommand(taskNames);

        logger.info('Running the following command:');
        logger.info('    ' + command);

        const killTasksResult = exec(command);
        if (killTasksResult.code !== 0) {
            console.warn('WARNING: kill command returned ' + killTasksResult.code);
        }
    }

    getKillCommand (taskNames) {
        const cli = utilities.isWindows()
            ? 'taskkill /t /F'
            : 'killall -9';

        const args = utilities.isWindows()
            ? taskNames.map(name => `/IM "${name}"`)
            : taskNames.map(name => `"${name}"`);

        return cli + ' ' + args.join(' ');
    }

    killAdbServer () {
        logger.info('Killing the adb server');
        const killServerCommand = 'adb kill-server';

        logger.info('Running the following command:');
        logger.info('    ' + killServerCommand);

        const killServerResult = exec(killServerCommand);
        if (killServerResult.code !== 0) {
            logger.error('Failed to kill the adb server with the code: ' + killServerResult.code);
        }

        logger.info('Killed the adb server.');
    }
}

module.exports = ParamedicKill;
