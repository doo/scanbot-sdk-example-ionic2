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
const path = require('path');
const { logger, exec, utilities } = require('./utils');
const ParamedicKill = require('./ParamedicKill');
const ANDROID_RETRY_TIMES = 3;
const ANDROID_TIME_OUT = 300000; // 5 Minutes

class ParamedicTargetChooser {
    constructor (appPath, config) {
        this.appPath = appPath;
        this.platform = config.getPlatformId();
        this.cli = config.getCli();
    }

    chooseTarget (emulator, target) {
        let targetObj = '';

        switch (this.platform) {
        case utilities.ANDROID:
            targetObj = this.chooseTargetForAndroid(emulator, target);
            break;

        case utilities.IOS:
            targetObj = this.chooseTargetForIOS(emulator, target);
            break;

        case utilities.WINDOWS:
            targetObj = this.chooseTargetForWindows(emulator, target);
            break;

        default:
            break;
        }

        return targetObj;
    }

    chooseTargetForAndroid (emulator, target) {
        logger.info('cordova-paramedic: Choosing Target for Android');

        if (target) {
            logger.info('cordova-paramedic: Target defined as: ' + target);
            return { target };
        }

        return this.startAnAndroidEmulator(target).then(emulatorId => ({ target: emulatorId }));
    }

    startAnAndroidEmulator (target) {
        logger.info('cordova-paramedic: Starting an Android emulator');

        const emuPath = path.join(this.appPath, 'platforms', 'android', 'cordova', 'lib', 'emulator');
        const emulator = require(emuPath);

        const tryStart = (numberTriesRemaining) => {
            return emulator.start(target, ANDROID_TIME_OUT)
                .then((emulatorId) => {
                    if (emulatorId) {
                        return emulatorId;
                    } else if (numberTriesRemaining > 0) {
                        const paramedicKill = new ParamedicKill(utilities.ANDROID);
                        paramedicKill.kill();
                        return tryStart(numberTriesRemaining - 1);
                    } else {
                        logger.error('cordova-paramedic: Could not start an Android emulator');
                        return null;
                    }
                });
        };

        // Check if the emulator has already been started
        return emulator.list_started()
            .then((started) => {
                if (started && started.length > 0) {
                    return started[0];
                } else {
                    return tryStart(ANDROID_RETRY_TIMES);
                }
            });
    }

    chooseTargetForWindows (emulator, target) {
        logger.info('cordova-paramedic: Choosing Target for Windows');
        const windowsCommand = this.cli + ' run --list --emulator' + utilities.PARAMEDIC_COMMON_CLI_ARGS;

        logger.info('cordova-paramedic: Running command: ' + windowsCommand);

        const devicesResult = exec(windowsCommand);
        if (devicesResult.code > 0) {
            logger.error('Failed to get the list of devices for Windows');
            return Q({ target: undefined });
        }

        const lines = devicesResult.stdout.split(/\n/);
        if (lines.length <= 1) {
            logger.error('No devices/emulators available for Windows');
            return Q({ target: undefined });
        }

        let targets = lines.filter(line => /^\d+\.\s+/.test(line));

        if (target) {
            for (let t in targets) {
                if (targets.hasOwnProperty(t) && t.indexOf(target) >= 0) {
                    targets = [ t ];
                    break;
                }
            }
        }

        return Q({ target: targets[0].split('. ')[0].trim() });
    }

    chooseTargetForIOS (emulator, target) {
        logger.info('cordova-paramedic: Choosing Target for iOS');

        const simulatorModelId = utilities.getSimulatorModelId(this.cli, target);
        const simulatorData = utilities.getSimulatorData(simulatorModelId);

        return Q({
            target: simulatorModelId,
            simId: simulatorData.simId
        });
    }
}

module.exports = ParamedicTargetChooser;
