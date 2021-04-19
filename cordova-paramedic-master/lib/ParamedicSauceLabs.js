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
const path = require('path');
const cp = require('child_process');
const Q = require('q');
const shell = require('shelljs');
const randomstring = require('randomstring');
const fs = require('fs');
const wd = require('wd');
const SauceLabs = require('saucelabs');
const sauceConnectLauncher = require('sauce-connect-launcher');
const { logger, exec, execPromise, utilities } = require('./utils');
const appPatcher = require('./appium/helpers/appPatcher');

class ParamedicSauceLabs {
    constructor (config, runner) {
        this.config = config;
        this.runner = runner;

        this.platformId = this.config.getPlatformId();
        this.isAndroid = this.platformId === utilities.ANDROID;
        this.isBrowser = this.platformId === utilities.BROWSER;
        this.isIos = this.platformId === utilities.IOS;
    }

    checkSauceRequirements () {
        if (!this.isAndroid && !this.isIos && !this.isBrowser) {
            logger.warn('Saucelabs only supports Android and iOS (and browser), falling back to testing locally.');
            this.config.setShouldUseSauce(false);
        } else if (!this.config.getSauceKey()) {
            throw new Error('Saucelabs key not set. Please set it via environmental variable ' +
                utilities.SAUCE_KEY_ENV_VAR + ' or pass it with the --sauceKey parameter.');
        } else if (!this.config.getSauceUser()) {
            throw new Error('Saucelabs user not set. Please set it via environmental variable ' +
                utilities.SAUCE_USER_ENV_VAR + ' or pass it with the --sauceUser parameter.');
        } else if (!this.runner.shouldWaitForTestResult()) {
            // don't throw, just silently disable Sauce
            this.config.setShouldUseSauce(false);
        }
    }

    packageApp () {
        switch (this.platformId) {
        case utilities.IOS: {
            return Q.Promise((resolve, reject) => {
                const zipCommand = 'zip -r ' + this.getPackageName() + ' ' + this.getBinaryName();
                shell.pushd(this.getPackageFolder());
                shell.rm('-rf', this.getPackageName());
                console.log('Running command: ' + zipCommand + ' in dir: ' + shell.pwd());
                exec(zipCommand, (code) => {
                    shell.popd();
                    if (code) {
                        reject('zip command returned with error code ' + code);
                    } else {
                        resolve();
                    }
                });
            });
        }
        case utilities.ANDROID:
            break; // don't need to zip the app for Android
        case utilities.BROWSER:
            break; // don't need to bundle the app on Browser platform at all
        default:
            throw new Error('Don\'t know how to package the app for platform: ' + this.platformId);
        }
        return Q.resolve();
    }

    uploadApp () {
        logger.normal('cordova-paramedic: uploading ' + this.getAppName() + ' to Sauce Storage');

        const sauceUser = this.config.getSauceUser();
        const key = this.config.getSauceKey();
        const uploadURI = encodeURI('https://saucelabs.com/rest/v1/storage/' + sauceUser + '/' + this.getAppName() + '?overwrite=true');
        const filePath = this.getPackagedPath();
        const uploadCommand =
            'curl -u ' + sauceUser + ':' + key +
            ' -X POST -H "Content-Type: application/octet-stream" ' +
            uploadURI + ' --data-binary "@' + filePath + '"';

        return execPromise(uploadCommand);
    }

    getPackagedPath () {
        return path.join(this.getPackageFolder(), this.getPackageName());
    }

    getPackageFolder () {
        const packageDirs = this.getPackageFolders();
        let foundDir = null;

        packageDirs.forEach((dir) => {
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                foundDir = dir;
            }
        });

        if (foundDir) return foundDir;

        throw new Error('Couldn\'t locate a built app directory. Looked here: ' + packageDirs);
    }

    getPackageFolders () {
        let packageFolders;

        switch (this.platformId) {
        case utilities.ANDROID:
            packageFolders = [
                path.join(this.runner.tempFolder.name, 'platforms', 'android', 'app', 'build', 'outputs', 'apk', 'debug'),
                path.join(this.runner.tempFolder.name, 'platforms', 'android', 'build', 'outputs', 'apk')
            ];
            break;

        case utilities.IOS:
            packageFolders = [ path.join(this.runner.tempFolder.name, 'platforms', 'ios', 'build', 'emulator') ];
            break;

        default:
            throw new Error('Don\t know where the package folder is for the platform: ' + this.platformId);
        }

        return packageFolders;
    }

    getPackageName () {
        let packageName;

        switch (this.platformId) {
        case utilities.IOS:
            packageName = 'HelloCordova.zip';
            break;

        case utilities.ANDROID:
            packageName = this.getBinaryName();
            break;

        default:
            throw new Error('Don\'t know what the package name is for platform: ' + this.platformId);
        }

        return packageName;
    }

    getBinaryName () {
        let binaryName;

        switch (this.platformId) {
        case utilities.ANDROID:
            shell.pushd(this.getPackageFolder());
            const apks = shell.ls('*debug.apk');

            if (apks.length > 0) {
                binaryName = apks.reduce((previous, current) => {
                    // if there is any apk for x86, take it
                    if (current.indexOf('x86') >= 0) return current;

                    // if not, just take the first one
                    return previous;
                });
            } else {
                throw new Error('Couldn\'t locate built apk');
            }

            shell.popd();
            break;

        case utilities.IOS:
            binaryName = 'HelloCordova.app';
            break;

        default:
            throw new Error('Don\'t know the binary name for the platform: ' + this.platformId);
        }

        return binaryName;
    }

    // Returns a name of the file at the SauceLabs storage
    getAppName () {
        // exit if we did this before
        if (this.appName) return this.appName;

        let appName = randomstring.generate();

        switch (this.platformId) {
        case utilities.ANDROID:
            appName += '.apk';
            break;

        case utilities.IOS:
            appName += '.zip';
            break;

        default:
            throw new Error('Don\'t know the app name for the platform: ' + this.platformId);
        }

        this.appName = appName; // save for additional function calls
        return appName;
    }

    displaySauceDetails (buildName) {
        if (!this.config.shouldUseSauce()) return Q();

        if (!buildName) {
            buildName = this.config.getBuildName();
        }

        const d = Q.defer();

        logger.normal('Getting saucelabs jobs details...\n');

        const sauce = new SauceLabs({
            username: this.config.getSauceUser(),
            password: this.config.getSauceKey()
        });

        sauce.getJobs((err, jobs) => {
            if (err) {
                console.log(err);
            }

            let found = false;
            for (let job in jobs) {
                if (jobs.hasOwnProperty(job) && jobs[job].name && jobs[job].name.indexOf(buildName) === 0) {
                    const jobUrl = 'https://saucelabs.com/beta/tests/' + jobs[job].id;
                    logger.normal('============================================================================================');
                    logger.normal('Job name: ' + jobs[job].name);
                    logger.normal('Job ID: ' + jobs[job].id);
                    logger.normal('Job URL: ' + jobUrl);
                    logger.normal('Video: ' + jobs[job].video_url);
                    logger.normal('Appium logs: ' + jobs[job].log_url);
                    if (this.isAndroid) {
                        logger.normal('Logcat logs: ' + 'https://saucelabs.com/jobs/' + jobs[job].id + '/logcat.log');
                    }
                    logger.normal('============================================================================================');
                    logger.normal('');
                    found = true;
                }
            }

            if (!found) {
                logger.warn('Can not find saucelabs job. Logs and video will be unavailable.');
            }
            d.resolve();
        });

        return d.promise;
    }

    getSauceCaps () {
        this.runner.sauceBuildName = this.runner.sauceBuildName || this.config.getBuildName();
        let caps = {
            name: this.runner.sauceBuildName,
            idleTimeout: '100', // in seconds
            maxDuration: utilities.SAUCE_MAX_DURATION,
            tunnelIdentifier: this.config.getSauceTunnelId()
        };

        switch (this.platformId) {
        case utilities.ANDROID:
            caps.platformName = 'Android';
            caps.appPackage = 'io.cordova.hellocordova';
            caps.appActivity = 'io.cordova.hellocordova.MainActivity';
            caps.app = 'sauce-storage:' + this.getAppName();
            caps.deviceType = 'phone';
            caps.deviceOrientation = 'portrait';
            caps.appiumVersion = this.config.getSauceAppiumVersion();
            caps.deviceName = this.config.getSauceDeviceName();
            caps.platformVersion = this.config.getSaucePlatformVersion();
            break;

        case utilities.IOS:
            caps.platformName = 'iOS';
            caps.autoAcceptAlerts = true;
            caps.waitForAppScript = 'true;';
            caps.app = 'sauce-storage:' + this.getAppName();
            caps.deviceType = 'phone';
            caps.deviceOrientation = 'portrait';
            caps.appiumVersion = this.config.getSauceAppiumVersion();
            caps.deviceName = this.config.getSauceDeviceName();
            caps.platformVersion = this.config.getSaucePlatformVersion();
            break;

        case utilities.BROWSER:
            caps.browserName = this.config.getSauceDeviceName() || 'chrome';
            caps.version = this.config.getSaucePlatformVersion() || '45.0';
            caps.platform = caps.browserName.indexOf('Edge') > 0 ? 'Windows 10' : 'macOS 10.13';
            // setting from env.var here and not in the config
            // because for any other platform we don't need to put the sauce connect up
            // unless the tunnel id is explicitly passed (means that user wants it anyway)
            if (!caps.tunnelIdentifier && process.env[utilities.SAUCE_TUNNEL_ID_ENV_VAR]) {
                caps.tunnelIdentifier = process.env[utilities.SAUCE_TUNNEL_ID_ENV_VAR];
            } else if (!caps.tunnelIdentifier) {
                throw new Error('Testing browser platform on Sauce Labs requires Sauce Connect tunnel. Please specify tunnel identifier via --sauceTunnelId');
            }
            break;

        default:
            throw new Error('Don\'t know the Sauce caps for the platform: ' + this.platformId);
        }

        return caps;
    }

    connectWebdriver () {
        const user = this.config.getSauceUser();
        const key = this.config.getSauceKey();
        const caps = this.getSauceCaps();

        logger.normal('cordova-paramedic: connecting webdriver');
        const spamDots = setInterval(() => {
            process.stdout.write('.');
        }, 1000);

        wd.configureHttp({
            timeout: utilities.WD_TIMEOUT,
            retryDelay: utilities.WD_RETRY_DELAY,
            retries: utilities.WD_RETRIES
        });

        const driver = wd.promiseChainRemote(utilities.SAUCE_HOST, utilities.SAUCE_PORT, user, key);
        return driver
            .init(caps)
            .then(() => {
                clearInterval(spamDots);
                process.stdout.write('\n');
            }, (error) => {
                clearInterval(spamDots);
                process.stdout.write('\n');
                throw (error);
            });
    }

    connectSauceConnect () {
        const isBrowser = this.isBrowser;

        // on platforms other than browser, only run sauce connect if user explicitly asks for it
        if (!isBrowser && !this.config.getSauceTunnelId()) return Q();
        // on browser, run sauce connect in any case
        if (isBrowser && !this.config.getSauceTunnelId()) {
            this.config.setSauceTunnelId(process.env[utilities.SAUCE_TUNNEL_ID_ENV_VAR] || this.config.getBuildName());
        }

        return Q.Promise((resolve, reject) => {
            logger.info('cordova-paramedic: Starting Sauce Connect...');
            sauceConnectLauncher({
                username: this.config.getSauceUser(),
                accessKey: this.config.getSauceKey(),
                tunnelIdentifier: this.config.getSauceTunnelId(),
                connectRetries: utilities.SAUCE_CONNECT_CONNECTION_RETRIES,
                connectRetryTimeout: utilities.SAUCE_CONNECT_CONNECTION_TIMEOUT,
                downloadRetries: utilities.SAUCE_CONNECT_DOWNLOAD_RETRIES,
                downloadRetryTimeout: utilities.SAUCE_CONNECT_DOWNLOAD_TIMEOUT
            }, (err, sauceConnectProcess) => {
                if (err) reject(err);

                this.sauceConnectProcess = sauceConnectProcess;
                logger.info('cordova-paramedic: Sauce Connect ready');
                resolve();
            });
        });
    }

    runSauceTests () {
        logger.warn('... on SauceLabs');
        logger.warn('---------------------------------------------------------');

        let isTestPassed = false;
        let pollForResults;
        let driver;
        let runProcess = null;

        if (!this.config.runMainTests()) {
            logger.normal('Skipping main tests...');
            return Q(utilities.TEST_PASSED);
        }

        logger.info('cordova-paramedic: running tests with sauce');

        return Q()
            .then(() => {
                // Build + "Upload" app
                if (!this.isBrowser) {
                    return this.buildApp()
                        .then(() => this.packageApp())
                        .then(() => this.uploadApp());
                }

                // for browser, we need to serve the app for Sauce Connect
                // we do it by just running "cordova run" and ignoring the chrome instance that pops up
                return Q().then(() => {
                    appPatcher.addCspSource(this.runner.tempFolder.name, 'connect-src', 'http://*');
                    appPatcher.permitAccess(this.runner.tempFolder.name, '*');
                    return this.runner.getCommandForStartingTests();
                }).then((command) => {
                    console.log('$ ' + command);
                    runProcess = cp.exec(command, () => {
                        // a precaution not to try to kill some other process
                        runProcess = null;
                    });
                });
            })
            .then(() => this.connectSauceConnect())
            .then(() => {
                driver = this.connectWebdriver();

                if (this.isBrowser) {
                    return driver.get('http://localhost:8000/cdvtests/index.html');
                }

                return driver;
            })
            .then(() => {
                if (this.config.getUseTunnel() || this.isBrowser) {
                    return driver;
                }

                return driver
                    .getWebviewContext()
                    .then((webview) => driver.context(webview));
            })
            .then(() => {
                if (this.isIos) {
                    logger.normal('cordova-paramedic: navigating to a test page');
                    return driver
                        .sleep(1000)
                        .elementByXPath('//*[text() = "Auto Tests"]')
                        .click();
                }

                return driver;
            })
            .then(() => {
                logger.normal('cordova-paramedic: connecting to app');

                const plugins = this.config.getPlugins();
                let skipBuster = false;

                // skip permission buster for splashscreen and inappbrowser plugins
                // it hangs the test run on Android 7 for some reason
                for (let i = 0; i < plugins.length; i++) {
                    if (plugins[i].indexOf('cordova-plugin-splashscreen') >= 0 || plugins[i].indexOf('cordova-plugin-inappbrowser') >= 0) {
                        skipBuster = true;
                    }
                }
                // always skip buster for browser platform
                if (this.isBrowser) {
                    skipBuster = true;
                }

                if (!this.config.getUseTunnel()) {
                    let polling = false;

                    pollForResults = setInterval(() => {
                        if (!polling) {
                            polling = true;
                            driver.pollForEvents(this.platformId, skipBuster)
                                .then((events) => {
                                    for (let i = 0; i < events.length; i++) {
                                        this.runner.server.emit(events[i].eventName, events[i].eventObject);
                                    }

                                    polling = false;
                                })
                                .fail((error) => {
                                    logger.warn('cordova-paramedic, pollForResults error: ' + error);
                                    polling = false;
                                });
                        }
                    }, 2500);
                }

                return this.runner.waitForTests();
            })
            .then((result) => {
                logger.normal('cordova-paramedic: Tests finished');
                isTestPassed = result;
            }, (error) => {
                logger.normal('cordova-paramedic: Tests failed to complete; ending session. The error is:\n' + error.stack);
            })
            .fin(() => {
                if (pollForResults) {
                    clearInterval(pollForResults);
                }
                if (driver && typeof driver.quit === 'function') {
                    return driver.quit();
                }
            })
            .fin(() => {
                if (this.isBrowser && !this.runner.browserPatched) {
                // we need to kill chrome
                    this.runner.killEmulatorProcess();
                }
                if (runProcess) {
                // as well as we need to kill the spawned node process serving our app
                    return Q.Promise((resolve) => {
                        utilities.killProcess(runProcess.pid, () => {
                            resolve();
                        });
                    });
                }
            })
            .fin(() => {
                if (this.sauceConnectProcess) {
                    logger.info('cordova-paramedic: Closing Sauce Connect process...');
                    return Q.Promise((resolve) => {
                        this.sauceConnectProcess.close(() => {
                            logger.info('cordova-paramedic: Successfully closed Sauce Connect process');
                            resolve();
                        });
                    });
                }
            })
            .then(() => {
                return isTestPassed;
            });
    }

    buildApp () {
        const command = this.getCommandForBuilding();

        logger.normal('cordova-paramedic: running command ' + command);

        return execPromise(command)
            .then((output) => {
                if (output.indexOf('BUILD FAILED') >= 0) {
                    throw new Error('Unable to build the project.');
                }
            }, (output) => {
            // this trace is automatically available in verbose mode
            // so we check for this flag to not trace twice
                if (!this.config.verbose) {
                    logger.normal(output);
                }

                throw new Error('Unable to build the project.');
            });
    }

    getCommandForBuilding () {
        let cmd = this.config.getCli() + ' build ' + this.platformId + utilities.PARAMEDIC_COMMON_CLI_ARGS;
        if (this.config.getArgs()) {
            cmd += ' ' + this.config.getArgs();
        }
        return cmd;
    }
}

module.exports = ParamedicSauceLabs;
