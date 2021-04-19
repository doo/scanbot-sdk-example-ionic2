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

const cp = require('child_process');
const shell = require('shelljs');
const Server = require('./LocalServer');
const path = require('path');
const Q = require('q');
const fs = require('fs');
const { logger, exec, execPromise, utilities } = require('./utils');
const Reporters = require('./Reporters');
const ParamedicKill = require('./ParamedicKill');
const AppiumRunner = require('./appium/AppiumRunner');
const ParamedicLogCollector = require('./ParamedicLogCollector');
const ParamediciOSPermissions = require('./ParamediciOSPermissions');
const ParamedicTargetChooser = require('./ParamedicTargetChooser');
const ParamedicAppUninstall = require('./ParamedicAppUninstall');
const ParamedicApp = require('./ParamedicApp');
const ParamedicSauceLabs = require('./ParamedicSauceLabs');

// this will add custom promise chain methods to the driver prototype
require('./appium/helpers/wdHelper');

// Time to wait for initial device connection.
// If device has not connected within this interval the tests are stopped.
const INITIAL_CONNECTION_TIMEOUT = 540000; // 9mins

Q.longStackSupport = true;

class ParamedicRunner {
    constructor (config) {
        this.tempFolder = null;
        this.config = config;
        this.targetObj = undefined;
        this.paramedicSauceLabs = null;

        this.isBrowser = this.config.getPlatformId() === utilities.BROWSER;
        this.isWindows = this.config.getPlatformId() === utilities.WINDOWS;
        this.isIos = this.config.getPlatformId() === utilities.IOS;

        exec.setVerboseLevel(config.isVerbose());
    }

    run () {
        let isTestPassed = false; // eslint-disable-line

        this.checkConfig();

        return Q().then(() => {
            // create project and prepare (install plugins, setup test startpage, install platform, check platform requirements)
            const paramedicApp = new ParamedicApp(this.config, this.storedCWD, this);
            this.tempFolder = paramedicApp.createTempProject();
            shell.pushd(this.tempFolder.name);
            return paramedicApp.prepareProjectToRunTests();
        })
            .then(() => {
                if (this.config.runMainTests()) {
                // start server
                    const noListener = (this.isBrowser) && this.config.shouldUseSauce();
                    return Server.startServer(this.config.getPorts(), this.config.getExternalServerUrl(), this.config.getUseTunnel(), noListener);
                }
            })
            .then((server) => {
                if (this.config.runMainTests()) {
                    // configure server usage
                    this.server = server;

                    this.injectReporters();
                    this.subcribeForEvents();

                    const logUrl = this.server.getConnectionUrl(this.config.getPlatformId());
                    this.writeMedicJson(logUrl);

                    logger.normal('Start building app and running tests at ' + (new Date()).toLocaleTimeString());
                }
                // run tests
                return this.runTests();
            })
            .timeout(this.config.getTimeout(), 'Timed out after waiting for ' + this.config.getTimeout() + ' ms.')
            .catch((error) => {
                logger.error(error);
                console.log(error.stack);
                throw new Error(error);
            })
            .fin((result) => {
                logger.warn('---------------------------------------------------------');
                logger.warn('6. Collect data and clean up');
                logger.warn('---------------------------------------------------------');

                isTestPassed = result;
                logger.normal('Completed tests at ' + (new Date()).toLocaleTimeString());

                // If we run --shouldUseSauce immedatly fetch and return Sauce details.
                if (this.config.shouldUseSauce()) {
                    return this.paramedicSauceLabs.displaySauceDetails.apply(this.paramedicSauceLabs, [this.sauceBuildName]); // eslint-disable-line
                }

                // When --shouldUseSauce and --justbuild is not set, fetch logs from the device.
                if (this.config.getAction() !== 'build') {
                // collect logs and uninstall app
                    this.collectDeviceLogs();
                    return this.uninstallApp()
                        .fail(() => { /* do not fail if uninstall fails */ })
                        .fin(() => {
                            this.killEmulatorProcess();
                        });
                }

                // --justbuild does nothing.
                return Q.resolve();
            })
            .fin(() => {
                this.cleanUpProject();
            });
    }

    checkConfig () {
        logger.warn('---------------------------------------------------------');
        logger.warn('0. Paramedic config');
        var config = this.config.getAll();
        for (var property in config) {
            if (config.hasOwnProperty(property)) {
                if (typeof config[property] !== 'undefined' && config[property] !== null) {
                    logger.warn(`   - ${property}: ${config[property]}`);
                }
            }
        }
        logger.warn('---------------------------------------------------------');

        if (this.config.shouldUseSauce()) {
            this.paramedicSauceLabs = new ParamedicSauceLabs(this.config, this);
            this.paramedicSauceLabs.checkSauceRequirements.apply(this.paramedicSauceLabs);
        }
        if (!this.config.runMainTests() && !this.config.runAppiumTests()) {
            throw new Error('No tests to run: both --skipAppiumTests and --skipMainTests are used');
        }

        if (!['cordova', 'phonegap'].includes(this.config.getCli())) {
            if (!path.isAbsolute(this.config.getCli())) {
                const cliAbsolutePath = path.resolve(this.config.getCli());
                this.config.setCli(cliAbsolutePath);
            }
        }

        logger.info('cordova-paramedic: Will use the following cli: ' + this.config.getCli());
    }

    setPermissions () {
        const applicationsToGrantPermission = ['kTCCServiceAddressBook'];
        if (this.isIos) {
            logger.info('cordova-paramedic: Setting required permissions.');
            const tccDb = this.config.getTccDb();
            if (tccDb) {
                const appName = utilities.PARAMEDIC_DEFAULT_APP_NAME;
                const paramediciOSPermissions = new ParamediciOSPermissions(appName, tccDb, this.targetObj);
                paramediciOSPermissions.updatePermissions(applicationsToGrantPermission);
            }
        }
    }

    injectReporters () {
        const reporters = Reporters.getReporters(this.config.getOutputDir());

        [
            'jasmineStarted',
            'specStarted',
            'specDone',
            'suiteStarted',
            'suiteDone',
            'jasmineDone'
        ].forEach((route) => {
            reporters.forEach((reporter) => {
                if (reporter[route] instanceof Function) {
                    this.server.on(route, reporter[route].bind(reporter));
                }
            });
        });
    }

    subcribeForEvents () {
        this.server.on('deviceLog', (data) => {
            logger.verbose('device|console.' + data.type + ': ' + data.msg[0]);
        });

        this.server.on('deviceInfo', (data) => {
            logger.normal('cordova-paramedic: Device info: ' + JSON.stringify(data));
        });
    }

    writeMedicJson (logUrl) {
        logger.normal('cordova-paramedic: writing medic log url to project ' + logUrl);
        fs.writeFileSync(path.join('www', 'medic.json'), JSON.stringify({ logurl: logUrl }));
    }

    maybeRunFileTransferServer () {
        return Q().then(() => {
            const plugins = this.config.getPlugins();
            for (let i = 0; i < plugins.length; i++) {
                if (plugins[i].indexOf('cordova-plugin-file-transfer') >= 0 && !this.config.getFileTransferServer() && !this.config.isCI()) {
                    return this.server.startFileTransferServer(this.tempFolder.name);
                }
            }
        });
    }

    runLocalTests () {
        logger.warn('... locally');
        logger.warn('---------------------------------------------------------');

        let runProcess = null;

        // checking for Android platform here because in this case we still need to start an emulator
        // will check again a bit lower
        if (!this.config.runMainTests() && this.config.getPlatformId() !== utilities.ANDROID) {
            logger.normal('Skipping main tests...');
            return Q(utilities.TEST_PASSED);
        }

        logger.info('cordova-paramedic: running tests locally');

        return Q()
            .then(() => this.maybeRunFileTransferServer())
            .then(() => this.getCommandForStartingTests())
            .then((command) => {
                this.setPermissions();

                return Q.all([
                    Q().then(() => {
                        logger.normal('cordova-paramedic: running command ' + command);

                        if (this.config.getPlatformId() !== utilities.BROWSER) {
                            return execPromise(command);
                        }
                        console.log('$ ' + command);

                        // a precaution not to try to kill some other process
                        runProcess = cp.exec(command, () => {
                            runProcess = null;
                        });
                    }),
                    Q().then(() => {
                        // skipping here and not at the beginning because we need to
                        // start up the Android emulator for Appium tests to run on
                        if (!this.config.runMainTests()) {
                            logger.normal('Skipping main tests...');
                            return utilities.TEST_PASSED;
                        }

                        // skip tests if it was just build
                        if (this.shouldWaitForTestResult()) {
                            return Q.promise((resolve, reject) => {
                            // reject if timed out
                                this.waitForConnection().catch(reject);
                                // resolve if got results
                                this.waitForTests().then(resolve);
                            });
                        }

                        return utilities.TEST_PASSED; // if we're not waiting for a test result, just report tests as passed
                    })
                ]);

            })
            .then((results) => {
                return results[1];
            })
            .fin((result) => {
                return runProcess
                    ? Q.Promise((resolve) => {
                        utilities.killProcess(runProcess.pid, () => {
                            resolve(result);
                        });
                    })
                    : result;
            });
    }

    runAppiumTests (useSauce) {
        logger.warn('---------------------------------------------------------');
        logger.warn('5. Run Appium tests');
        logger.warn('---------------------------------------------------------');

        const platform = this.config.getPlatformId();
        logger.normal('Start running Appium tests...');

        if (this.config.getAction() === 'build') {
            logger.normal('Skipping Appium tests: action = build ...');
            return Q(utilities.TEST_PASSED);
        }
        if (!this.config.runAppiumTests()) {
            logger.normal('Skipping Appium tests: not configured to run ...');
            return Q(utilities.TEST_PASSED);
        }
        if (platform !== utilities.ANDROID && platform !== utilities.IOS) {
            logger.warn('Unsupported platform for Appium test run: ' + platform);
            // just skip Appium tests
            return Q(utilities.TEST_PASSED);
        }
        if (!useSauce && (!this.targetObj || !this.targetObj.target)) {
            throw new Error('Cannot determine local device name for Appium');
        }

        logger.normal('Running Appium tests ' + (useSauce ? 'on Sauce Labs' : 'locally'));

        let options = {
            platform: platform,
            appPath: this.tempFolder.name,
            pluginRepos: this.config.getPlugins().map(plugin => path.join(this.tempFolder.name, 'plugins', path.basename(plugin))),
            appiumDeviceName: this.targetObj && this.targetObj.target,
            udid: this.targetObj && this.targetObj.simId,
            appiumPlatformVersion: null,
            screenshotPath: path.join(process.cwd(), 'appium_screenshots'),
            output: this.config.getOutputDir(),
            verbose: this.config.isVerbose(),
            sauce: useSauce,
            cli: this.config.getCli()
        };

        if (useSauce) {
            options.sauceAppPath = 'sauce-storage:' + this.paramedicSauceLabs.getAppName.apply(this.paramedicSauceLabs);
            options.sauceUser = this.config.getSauceUser();
            options.sauceKey = this.config.getSauceKey();
            options.sauceCaps = this.paramedicSauceLabs.getSauceCaps.apply(this.paramedicSauceLabs);
            options.sauceCaps.name += '_Appium';
        }

        const appiumRunner = new AppiumRunner(options);
        if (appiumRunner.options.testPaths && appiumRunner.options.testPaths.length === 0) {
            logger.warn('Couldn\'t find Appium tests, skipping...');
            return Q(utilities.TEST_PASSED);
        }

        return Q()
            .then(() => appiumRunner.prepareApp())
            .then(() => {
                if (useSauce) {
                    return this.paramedicSauceLabs.packageApp.apply(this.paramedicSauceLabs)
                        .then(() => this.paramedicSauceLabs.uploadApp.apply(this.paramedicSauceLabs));
                }
            })
            .then(() => appiumRunner.runTests(useSauce));
    }

    runTests () {
        let isTestPassed = false;

        logger.warn('---------------------------------------------------------');
        logger.warn('4. Run (Jasmine) tests...');

        // Sauce Labs
        if (this.config.shouldUseSauce()) {
            return this.paramedicSauceLabs.runSauceTests.apply(this.paramedicSauceLabs)
                .then((result) => {
                    isTestPassed = result;
                })
                .then(() => this.runAppiumTests(true))
                .then(isAppiumTestPassed => isTestPassed === utilities.TEST_PASSED && isAppiumTestPassed === utilities.TEST_PASSED);
        // Not Sauce Labs
        } else {
            return this.runLocalTests()
                .then((result) => {
                    isTestPassed = result;
                })
                .then(() => this.runAppiumTests())
                .then(isAppiumTestPassed => isTestPassed === utilities.TEST_PASSED && isAppiumTestPassed === utilities.TEST_PASSED);
        }
    }

    waitForTests () {
        logger.info('cordova-paramedic: waiting for test results');
        return Q.promise((resolve, reject) => {

            // time out if connection takes too long
            const ERR_MSG = 'waitForTests: Seems like device not connected to local server in ' + INITIAL_CONNECTION_TIMEOUT / 1000 + ' secs';
            setTimeout(() => {
                if (!this.server.isDeviceConnected()) {
                    reject(new Error(ERR_MSG));
                }
            }, INITIAL_CONNECTION_TIMEOUT);

            this.server.on('jasmineDone', (data) => {
                logger.info('cordova-paramedic: tests have been completed');

                // Is Test Passed
                resolve((data.specResults.specFailed === 0));
            });

            this.server.on('disconnect', () => {
                reject(new Error('Device is disconnected before passing the tests'));
            });
        });
    }

    getCommandForStartingTests () {
        let cmd = [
            this.config.getCli(),
            this.config.getAction(),
            this.config.getPlatformId()
        ]
            .concat(utilities.PARAMEDIC_COMMON_ARGS)
            .concat([this.config.getArgs()]);

        if (this.isBrowser) {
            return cmd.join(' ');
        } else if (this.config.getAction() === 'build' || (this.isWindows && this.config.getArgs().indexOf('appx=8.1-phone') < 0)) {
            // The app is to be run as a store app or just build. So no need to choose a target.
            return Q(cmd.join(' '));
        }

        // For now we always trying to run test app on emulator
        return (new ParamedicTargetChooser(this.tempFolder.name, this.config)).chooseTarget(
            true, // useEmulator
            this.config.getTarget() // preferredTarget
        ).then(targetObj => {
            this.targetObj = targetObj;

            return cmd
                .concat(['--target', `"${this.targetObj.target}"`])
                // CB-11472 In case of iOS provide additional '--emulator' flag, otherwise
                // 'cordova run ios --target' would hang waiting for device with name
                // as specified in 'target' in case if any device is physically connected
                .concat(this.isIos ? ['--emulator'] : [])
                .join(' ');
        });
    }

    shouldWaitForTestResult () {
        const action = this.config.getAction();
        return (action.indexOf('run') === 0) || (action.indexOf('emulate') === 0);
    }

    waitForConnection () {
        const ERR_MSG = 'waitForConnection: Seems like device not connected to local server in ' + INITIAL_CONNECTION_TIMEOUT / 1000 + ' secs';

        return Q.promise((resolve, reject) => {
            setTimeout(() => {
                if (!this.server.isDeviceConnected()) {
                    reject(new Error(ERR_MSG));
                } else {
                    resolve();
                }
            }, INITIAL_CONNECTION_TIMEOUT);
        });
    }

    cleanUpProject () {
        this.server && this.server.cleanUp();
        if (this.config.shouldCleanUpAfterRun()) {
            logger.info('cordova-paramedic: Deleting the application: ' + this.tempFolder.name);
            shell.popd();
            shell.rm('-rf', this.tempFolder.name);
        }
    }

    killEmulatorProcess () {
        if (this.config.shouldCleanUpAfterRun()) {
            logger.info('cordova-paramedic: Killing the emulator process.');
            const paramedicKill = new ParamedicKill(this.config.getPlatformId());
            paramedicKill.kill();
        }
    }

    collectDeviceLogs () {
        logger.info('Collecting logs for the devices.');
        const outputDir = this.config.getOutputDir() ? this.config.getOutputDir() : this.tempFolder.name;
        const logMins = this.config.getLogMins() ? this.config.getLogMins() : utilities.DEFAULT_LOG_TIME;
        const paramedicLogCollector = new ParamedicLogCollector(this.config.getPlatformId(), this.tempFolder.name, outputDir, this.targetObj);
        paramedicLogCollector.collectLogs(logMins);
    }

    uninstallApp () {
        logger.info('Uninstalling the app.');
        const paramedicAppUninstall = new ParamedicAppUninstall(this.tempFolder.name, this.config.getPlatformId());
        return paramedicAppUninstall.uninstallApp(this.targetObj, utilities.PARAMEDIC_DEFAULT_APP_NAME);
    }
}

let storedCWD = null;

exports.run = function (paramedicConfig) {
    storedCWD = storedCWD || process.cwd();

    const runner = new ParamedicRunner(paramedicConfig, null);
    runner.storedCWD = storedCWD;

    return runner.run();
};
