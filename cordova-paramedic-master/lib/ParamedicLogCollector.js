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
const fs = require('fs');
const path = require('path');
const { logger, exec, utilities } = require('./utils');

class ParamedicLogCollector {
    constructor (platform, appPath, outputDir, targetObj) {
        this.platform = platform;
        this.appPath = appPath;
        this.outputDir = outputDir;
        this.targetObj = targetObj;
    }

    logIOS () {
        if (!this.targetObj) {
            logger.warn('It looks like there is no target to get logs from.');
            return;
        }

        const simId = this.targetObj.simId;

        if (simId) {
            const homedir = require('os').homedir();
            // Now we can print out the log file
            const logPath = path.join(homedir, 'Library', 'Logs', 'CoreSimulator', simId, 'system.log');
            const logCommand = 'cat ' + logPath;
            this.generateLogs(logCommand);
        } else {
            logger.error('Failed to find the ID of the simulator');
        }
    }

    logWindows (appPath, logMins) {
        const logScriptPath = path.join(appPath, 'platforms', 'windows', 'cordova', 'log.bat');

        if (fs.existsSync(logScriptPath)) {
            let mins = utilities.DEFAULT_LOG_TIME;

            if (logMins) {
                mins = logMins + utilities.DEFAULT_LOG_TIME_ADDITIONAL;
            }

            const logCommand = logScriptPath + ' --dump --mins ' + mins;
            this.generateLogs(logCommand);
        }
    }

    logAndroid () {
        if (!this.targetObj) {
            logger.warn('It looks like there is no target to get logs from.');
            return;
        }

        const logCommand = 'adb -s ' + this.targetObj.target + ' logcat -d -v time';
        const numDevices = utilities.countAndroidDevices();

        if (numDevices !== 1) {
            logger.error('There must be exactly one emulator/device attached');
            return;
        }

        this.generateLogs(logCommand);
    }

    generateLogs (logCommand) {
        logger.info('Running Command: ' + logCommand);

        const logFile = this.getLogFileName();
        const result = exec(logCommand);

        if (result.code > 0) {
            logger.error('Failed to run command: ' + logCommand);
            logger.error('Failure code: ' + result.code);
            return;
        }

        try {
            fs.writeFileSync(logFile, result.stdout);
            logger.info('Logfiles are written to: ' + logFile);
        } catch (ex) {
            logger.error('Cannot write the log results to the file. ' + ex);
        }
    }

    getLogFileName () {
        return path.join(this.outputDir, this.platform + '_logs.txt');
    }

    collectLogs (logMins) {
        shelljs.config.fatal = false;
        shelljs.config.silent = false;

        switch (this.platform) {
        case utilities.ANDROID:
            this.logAndroid();
            break;

        case utilities.IOS:
            this.logIOS(this.appPath);
            break;

        case utilities.WINDOWS:
            this.logWindows(this.appPath, logMins);
            break;

        default:
            logger.info('Logging is unsupported for ' + this.platform + ', skipping...');
            break;
        }
    }
}

module.exports = ParamedicLogCollector;
