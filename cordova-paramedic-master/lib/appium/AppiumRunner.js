#!/usr/bin/env node

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const fs = require('fs');
const path = require('path');
const wd = require('wd');
const wdHelper = require('./helpers/wdHelper');
const screenshotHelper = require('./helpers/screenshotHelper');
const appPatcher = require('./helpers/appPatcher.js');
const child_process = require('child_process');
const expectTelnet = require('expect-telnet');
const shell = require('shelljs');
const Jasmine = require('jasmine');
const unorm = require('unorm');
const Q = require('q');
const portChecker = require('tcp-port-used');
const { ParamedicReporter, getReporters } = require('../Reporters');
const { logger, exec, execPromise, utilities } = require('../utils');

const SMALL_BUFFER_SIZE = 1024 * 1024;
const BIG_BUFFER_SIZE = 50 * 1024 * 1024;
const APPIUM_SERVER_PATH = getAppiumServerPath();

class AppiumRunner {
    constructor (options) {
        this.options = options;
        this.prepareOptions();
        this.createScreenshotDir();
        this.findTests();
        this.setGlobals();
    }

    createScreenshotDir () {
        utilities.mkdirSync(this.options.screenshotPath);
    }

    prepareOptions () {
        if (!this.options.hasOwnProperty('device')) {
            this.options.device = false;
        }

        if (this.options.platform === utilities.IOS && this.options.appiumDeviceName) {
            this.options.appiumDeviceName = this.options.appiumDeviceName.replace(/-/g, ' ');
        }
    }

    cleanUp (callback) {
        killProcess(this.appium, () => {
            killProcess(this.iosProxy, () => {
                callback();
            });
        });
    }

    startTests () {
        const jasmine = new Jasmine();
        const d = Q.defer();

        const exitGracefully = (e) => {
            if (this.exiting) return;

            if (e) {
                logger.normal('paramedic-appium: ' + e);
            }
            logger.normal('paramedic-appium: Uncaught exception! Killing Appium server and exiting in 2 seconds...');
            this.exiting = true;
            this.cleanUp(() => {
                setTimeout(() => {
                    d.reject(e.stack);
                }, 2000);
            });
        };

        process.on('uncaughtException', (err) => {
            exitGracefully(err);
        });

        logger.normal('paramedic-appium: Running tests from:');
        this.options.testPaths.forEach((testPath) => {
            logger.normal('paramedic-appium: ' + testPath);
        });

        jasmine.loadConfig({
            spec_dir: '',
            spec_files: this.options.testPaths
        });

        // don't use default reporter, it exits the process before
        // we would get the chance to kill appium server
        // jasmine.configureDefaultReporter({ showColors: false });

        const outputDir = this.options.output || process.cwd();
        const reporters = getReporters(outputDir);
        const paramedicReporter = new ParamedicReporter((passed) => {
            this.passed = passed;
            this.cleanUp(d.resolve);
        });

        reporters.forEach((reporter) => {
            jasmine.addReporter(reporter);
        });
        jasmine.addReporter(paramedicReporter);

        try {
            // Launch the tests!
            jasmine.execute();
        } catch (e) {
            exitGracefully(e);
        }

        return d.promise;
    }

    startIosProxy () {
        let iosProxyCommand;
        this.iosProxy = {
            alive: false,
            process: null
        };

        if (this.options.platform === utilities.IOS && this.options.device && this.options.udid) {
            iosProxyCommand = 'ios_webkit_debug_proxy -c ' + this.options.udid + ':27753';
            logger.normal('paramedic-appium: Running:');
            logger.normal('paramedic-appium: ' + iosProxyCommand);
            this.iosProxy.alive = true;
            console.log('$ ' + iosProxyCommand);
            this.iosProxy.process = child_process.exec(iosProxyCommand, { maxBuffer: BIG_BUFFER_SIZE }, () => {
                this.iosProxy.alive = false;
                logger.normal('paramedic-appium: iOS proxy process exited.');
            });
        }
    }

    startAppiumServer () {
        const d = Q.defer();
        let appiumServerCommand;
        let additionalArgs = '';
        this.appium = {
            alive: false,
            process: null
        };

        // compose a command to run the Appium server
        switch (this.options.platform) {
        case utilities.ANDROID:
            break;

        case utilities.IOS:
            if (this.options.udid) {
                additionalArgs += ' --udid ' + this.options.udid;
            }
            break;

        default:
            throw new Error('Unsupported platform: ' + this.options.platform);
        }

        if (this.options.logFile) {
            additionalArgs += ' --log ' + this.options.logFile;
        }

        appiumServerCommand = 'node ' + APPIUM_SERVER_PATH + additionalArgs;

        // run the Appium server
        logger.normal('paramedic-appium: Running:');
        logger.normal('paramedic-appium: ' + appiumServerCommand);
        this.appium.alive = true;
        console.log('$ ' + appiumServerCommand);
        this.appium.process = child_process.exec(appiumServerCommand, { maxBuffer: BIG_BUFFER_SIZE }, (error) => {
            logger.normal('paramedic-appium: Appium process exited.');
            if (this.appium.alive && error) {
                logger.normal('paramedic-appium: Error running appium server: ' + error);
                if (isFailFastError(error)) {
                    this.cleanUp(d.reject);
                } else {
                    logger.normal('paramedic-appium: Another instance already running? Will try to run tests on it.');
                    d.resolve();
                }
            }
            this.appium.alive = false;
        });

        // Wait for the Appium server to start up
        this.appium.process.stdout.on('data', (data) => {
            if (data.indexOf('Appium REST http interface listener started') > -1) {
                d.resolve();
            }
        });

        return d.promise;
    }

    findTests () {
        if (!this.options.pluginRepos) {
            this.options.pluginRepos = getPluginDirs(this.options.appPath);
        }

        // looking for the tests
        this.options.testPaths = [];
        let searchPaths = [];
        this.options.pluginRepos.forEach((pluginRepo) => {
            searchPaths.push(path.join(pluginRepo, 'appium-tests', this.options.platform));
            searchPaths.push(path.join(pluginRepo, 'appium-tests', 'common'));
        });
        searchPaths.forEach((searchPath) => {
            logger.normal('paramedic-appium: Looking for tests in: ' + searchPath);
            if (fs.existsSync(searchPath)) {
                logger.normal('paramedic-appium: Found tests in: ' + searchPath);
                if (path.isAbsolute(searchPath)) {
                    searchPath = path.relative(process.cwd(), searchPath);
                }
                this.options.testPaths.push(path.join(searchPath, '*.spec.js'));
            }
        });
    }

    setGlobals () {
        // setting up the global variables so the tests could use them
        global.WD = wd;
        global.WD_HELPER = wdHelper;
        global.SCREENSHOT_HELPER = screenshotHelper;
        global.ET = expectTelnet;
        global.SHELL = shell;
        global.DEVICE = this.options.device;
        global.DEVICE_NAME = this.options.appiumDeviceName;
        global.PLATFORM = this.options.platform;
        global.PLATFORM_VERSION = this.options.appiumPlatformVersion;
        global.SCREENSHOT_PATH = this.options.screenshotPath;
        global.UNORM = unorm;
        global.UDID = this.options.udid;
        global.VERBOSE = this.options.verbose;
        global.USE_SAUCE = this.options.sauce;
        global.SAUCE_USER = this.options.sauceUser;
        global.SAUCE_KEY = this.options.sauceKey;
        global.SAUCE_CAPS = this.options.sauceCaps;
        global.VERBOSE = this.options.verbose;
        global.SAUCE_SERVER_HOST = utilities.SAUCE_HOST;
        global.SAUCE_SERVER_PORT = utilities.SAUCE_PORT;
    }

    prepareApp () {
        const d = Q.defer();
        const fullAppPath = getFullAppPath(this.options.appPath);
        const deviceString = this.options.device ? ' --device' : '';
        const buildCommand = this.options.cli + ' build ' + this.options.platform + deviceString + utilities.PARAMEDIC_COMMON_CLI_ARGS;

        // remove medic.json and (re)build
        shell.rm(path.join(fullAppPath, 'www', 'medic.json'));
        fs.stat(fullAppPath, (error, stats) => {
            // check if the app exists
            if (error || !stats.isDirectory()) {
                d.reject('The app directory doesn\'t exist: ' + fullAppPath);
            }

            // set properties/CSP rules
            if (this.options.platform === utilities.IOS) {
                appPatcher.setPreference(fullAppPath, 'CameraUsesGeolocation', 'true');
            } else if (this.options.platform === utilities.ANDROID) {
                appPatcher.setPreference(fullAppPath, 'loadUrlTimeoutValue', 60000);
            }
            appPatcher.addCspSource(fullAppPath, 'connect-src', 'http://*');
            appPatcher.permitAccess(fullAppPath, '*');
            // add cordova-save-image-gallery plugin from npm to enable
            // Appium tests for camera plugin to save test image to the gallery
            runCommand(this.options.cli + ' plugin add cordova-save-image-gallery' + utilities.PARAMEDIC_COMMON_CLI_ARGS, fullAppPath);

            // rebuild the app
            logger.normal('paramedic-appium: Building the app...');
            console.log('$ ' + buildCommand);
            child_process.exec(buildCommand, { cwd: fullAppPath, maxBuffer: SMALL_BUFFER_SIZE }, (error, stdout, stderr) => {
                if (error || stdout.indexOf('BUILD FAILED') >= 0 || stderr.indexOf('BUILD FAILED') >= 0) {
                    d.reject('Couldn\'t build the app: ' + error);
                } else {
                    global.PACKAGE_PATH = getPackagePath(this.options);
                    d.resolve();
                }
            });
        });
        return d.promise;
    }

    runTests (useSauce) {
        return Q().then(() => {
            if (!useSauce) {
                this.startIosProxy();
                // check if Appium is already running
                return portChecker.check(4723).then((isInUse) => {
                    if (!isInUse) {
                        return installAppiumServer()
                            .then(this.startAppiumServer.bind(this));
                    }
                    logger.info('paramedic-appium: Appium port is taken, looks like it is already running. Jumping straight to running tests.');
                });
            }
        })
            .then(this.startTests.bind(this))
            .then(() => this.passed);
    }
}

function getAppiumServerPath () {
    return path.resolve(__dirname, '..', '..', 'node_modules', 'appium', 'build', 'lib', 'main.js');
}

function getFullAppPath (appPath) {
    let fullPath = appPath;

    if (!path.isAbsolute(appPath)) {
        fullPath = path.join(__dirname, '..', '..', appPath);
    }

    return fullPath;
}

function getPackagePath (options) {
    if (options.sauce) return options.sauceAppPath;

    const fullAppPath = getFullAppPath(options.appPath);

    switch (options.platform) {
    case utilities.ANDROID:
        let packagePath = null;
        const maybePackagePaths = [
            path.join(fullAppPath, 'platforms', 'android', 'app', 'build', 'outputs', 'apk', 'android-debug.apk'),
            path.join(fullAppPath, 'platforms', 'android', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
        ];

        maybePackagePaths.forEach((p) => {
            if (fs.existsSync(p)) {
                packagePath = p;
            }
        });

        if (packagePath != null) {
            return packagePath;
        }
        throw new Error('Could not find apk');

    case utilities.IOS:
        const searchDir = options.device ?
            path.join(fullAppPath, 'platforms', 'ios', 'build', 'device') :
            path.join(fullAppPath, 'platforms', 'ios', 'build', 'emulator');

        const mask = options.device ? '.ipa$' : '.app$';
        const files = fs.readdirSync(searchDir)
            .filter(file => file.match(new RegExp(mask)));

        logger.normal(`paramedic-appium: Looking for the app package in "${searchDir}" with the filter of "${mask}"`);

        if (files && files.length > 0) {
            logger.normal('paramedic-appium: Found the app package: ' + files[0]);
            return path.resolve(searchDir, files[0]);
        }

        throw new Error('Could not find the app package');
    }
}

function getPluginDirs (appPath) {
    return shell.ls(path.join(appPath, 'plugins', 'cordova-plugin-*'));
}

function runCommand (command, appPath) {
    if (appPath) {
        shell.pushd(appPath);
    }

    exec(command);

    if (appPath) {
        shell.popd();
    }
}

function isFailFastError (error) {
    if (error && error.message) {
        return error.message.indexOf('Could not find a connected') > -1 ||
            error.message.indexOf('Bad app') > -1;
    }

    return false;
}

function killProcess (procObj, callback) {
    if (procObj && procObj.alive) {
        procObj.alive = false;
        utilities.killProcess(procObj.pid, callback);
    } else {
        callback();
    }
}

function installAppiumServer () {
    const installPath = path.join(__dirname, '..', '..');

    logger.normal('paramedic-appium: Installing Appium server to ' + installPath);
    shell.pushd(installPath);

    return execPromise('npm install appium').then(() => {
        shell.popd();
    });
}

module.exports = AppiumRunner;
