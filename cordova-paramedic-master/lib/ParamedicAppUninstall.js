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

const path = require('path');
const fs = require('fs');
const Q = require('q');
const { logger, exec, utilities } = require('./utils');

class ParamedicAppUninstall {
    constructor (appPath, platform) {
        this.appPath = appPath;
        this.platform = platform;
    }

    uninstallApp (targetObj, app) {
        if (!targetObj || !targetObj.target) { return Q(); }

        switch (this.platform) {
        case utilities.ANDROID:
            return this.uninstallAppAndroid(targetObj, app);

        case utilities.IOS:
            return this.uninstallAppIOS(targetObj, app);

        case utilities.WINDOWS:
            return this.uninstallAppWindows(targetObj, app);

        default:
            return Q();
        }
    }

    uninstallAppAndroid (targetObj, app) {
        const uninstallCommand = 'adb -s ' + targetObj.target + ' uninstall ' + app;
        return this.executeUninstallCommand(uninstallCommand);
    }

    uninstallAppWindows (targetObj) {
        const platformPath = path.join(this.appPath, 'platforms', 'windows');
        const packageJSPath = path.join(platformPath, 'cordova', 'lib', 'package.js');
        const programFilesPath = process.env['ProgramFiles(x86)'] || process.env.ProgramFiles;
        const appDeployPath = path.join(programFilesPath, 'Microsoft SDKs', 'Windows Phone', 'v8.1', 'Tools', 'AppDeploy', 'AppDeployCmd.exe');

        if (fs.existsSync(packageJSPath)) {
            const packageJS = require(packageJSPath);
            const appId = packageJS.getAppId(platformPath);
            const uninstallCommand = '"' + appDeployPath + '"' + ' /uninstall ' + appId + ' /targetdevice:' + targetObj.target;
            return this.executeUninstallCommand(uninstallCommand);
        }
        return Q();
    }

    /**
     * Uninstalls the Application form target by Bundle Identifier
     *
     * @param {Object} target The device/emulator data which contains the device and UUID.
     * @param {String} appBundleIdentifier The Application Bundle Identifier
     */
    uninstallAppIOS (target, appBundleIdentifier) {
        return this.executeUninstallCommand(`xcrun simctl uninstall ${target.simId} ${appBundleIdentifier}`);
    }

    executeUninstallCommand (uninstallCommand) {
        return Q.Promise((resolve, reject) => {
            logger.info('cordova-paramedic: Running command: ' + uninstallCommand);
            exec(uninstallCommand, (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    logger.error('Failed to uninstall the app');
                    logger.error('Error code: ' + code);
                    reject();
                }
            });
        }).timeout(60000)
            .fail(() => {
                logger.warn('cordova-paramedic: App uninstall timed out!');
            });
    }
}

module.exports = ParamedicAppUninstall;
