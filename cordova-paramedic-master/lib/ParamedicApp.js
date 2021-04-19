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

const Q = require('q');
const tmp = require('tmp');
const shell = require('shelljs');
const path = require('path');
const PluginsManager = require('./PluginsManager');
const appPatcher = require('./appium/helpers/appPatcher');
const { logger, exec, execPromise, utilities } = require('./utils');

class ParamedicApp {
    constructor (config, storedCWD, runner) {
        this.config = config;
        this.storedCWD = storedCWD;
        this.runner = runner;
        this.tempFolder = null;

        this.platformId = this.config.getPlatformId();
        this.isAndroid = this.platformId === utilities.ANDROID;
        this.isBrowser = this.platformId === utilities.BROWSER;
        this.isIos = this.platformId === utilities.IOS;
        this.isWindows = this.platformId === utilities.WINDOWS;

        logger.info('---------------------------------------------------------');
        logger.info('1. Create Cordova app with platform and plugin(s) to test');
        logger.info('- platform: ' + this.config.getPlatformId());
        logger.info('- plugin(s): ' + this.config.getPlugins().join(', '));
        logger.info('---------------------------------------------------------');
    }

    createTempProject () {
        this.tempFolder = tmp.dirSync();
        tmp.setGracefulCleanup();
        logger.info('cordova-paramedic: creating temp project at ' + this.tempFolder.name);
        exec(this.config.getCli() + ' create ' + this.tempFolder.name + utilities.PARAMEDIC_COMMON_CLI_ARGS);
        return this.tempFolder;
    }

    prepareProjectToRunTests () {
        this.installPlugins();
        this.setUpStartPage();
        return this.installPlatform()
            .then(() => this.checkPlatformRequirements());
    }

    installPlugins () {
        logger.info('cordova-paramedic: installing plugins');
        const pluginsManager = new PluginsManager(this.tempFolder.name, this.storedCWD, this.config);
        pluginsManager.installPlugins(this.config.getPlugins());
        pluginsManager.installTestsForExistingPlugins();

        let additionalPlugins = ['github:apache/cordova-plugin-test-framework', path.join(__dirname, '..', 'paramedic-plugin')];

        if (this.config.shouldUseSauce() && !this.config.getUseTunnel()) {
            additionalPlugins.push(path.join(__dirname, '..', 'event-cache-plugin'));
        }

        if (this.isWindows) {
            additionalPlugins.push(path.join(__dirname, '..', 'debug-mode-plugin'));
        }

        if (this.isIos) {
            additionalPlugins.push(path.join(__dirname, '..', 'ios-geolocation-permissions-plugin'));
        }

        if (this.config.isCI()) {
            additionalPlugins.push(path.join(__dirname, '..', 'ci-plugin'));
        }

        pluginsManager.installPlugins(additionalPlugins);
    }

    setUpStartPage () {
        logger.normal('cordova-paramedic: setting the app start page to the test page');
        shell.sed('-i', 'src="index.html"', 'src="cdvtests/index.html"', 'config.xml');
    }

    installPlatform () {
        const platform = this.config.getPlatform();
        logger.info('cordova-paramedic: adding platform ' + platform + ' (with: ' + utilities.PARAMEDIC_COMMON_CLI_ARGS + utilities.PARAMEDIC_PLATFORM_ADD_ARGS + ')');

        return execPromise(this.config.getCli() + ' platform add ' + platform + utilities.PARAMEDIC_COMMON_CLI_ARGS + utilities.PARAMEDIC_PLATFORM_ADD_ARGS)
            .then(() => {
                logger.info('cordova-paramedic: successfully finished adding platform ' + platform);
                if (this.isAndroid && this.config.isCI()) {
                    logger.info('cordova-paramedic: monkey patching Android platform to disable gradle daemon...');
                    const gradleBuilderFile = path.join(this.tempFolder.name, 'platforms', 'android', 'cordova', 'lib', 'builders', 'GradleBuilder.js');
                    // remove the line where the gradle daemon is forced on
                    if (appPatcher.monkeyPatch(gradleBuilderFile, /args\.push\('-Dorg\.gradle\.daemon=true'\);/, '//args.push(\'-Dorg.gradle.daemon=true\');')) {
                        logger.info('cordova-paramedic: success!');
                    } else {
                        logger.info('cordova-paramedic: couldn\'t apply the patch. It must be good news: does cordova-android not hard-code gradle daemon anymore?');
                    }
                } else if (this.isBrowser && this.config.shouldUseSauce()) {
                    logger.info('cordova-paramedic: I like patching stuff, so...');
                    logger.info('cordova-paramedic: monkey patching browser platform to disable browser pop-up.');
                    let cordovaRunFile = path.join(this.tempFolder.name, 'platforms', 'browser', 'cordova', 'run');
                    // we need to supply some replacement string so this method can properly return a result
                    if (appPatcher.monkeyPatch(cordovaRunFile, /return cordovaServe\.launchBrowser\(.*\);/, '// no pop-up please')) {
                        logger.info('cordova-paramedic: success!');
                        this.runner.browserPatched = true;
                    } else {
                        cordovaRunFile = path.join(this.tempFolder.name, 'platforms', 'browser', 'cordova', 'lib', 'run.js');
                        if (appPatcher.monkeyPatch(cordovaRunFile, /return server\.launchBrowser\(\{'target': args\.target, 'url': projectUrl\}\);/, '// no pop-up please')) {
                            logger.info('cordova-paramedic: success!');
                            this.runner.browserPatched = true;
                        } else {
                            logger.info('cordova-paramedic: couldn\'t apply the patch. Not a big deal, though: things should work anyway.');
                            this.runner.browserPatched = false;
                        }
                    }
                }
            });
    }

    checkPlatformRequirements () {
        if (this.isBrowser) return Q();

        logger.normal('cordova-paramedic: checking the requirements for platform: ' + this.platformId);
        return execPromise(this.config.getCli() + ' requirements ' + this.platformId + utilities.PARAMEDIC_COMMON_CLI_ARGS)
            .then(() => {
                logger.info('cordova-paramedic: successfully finished checking the requirements for platform: ' + this.platformId);
            });
    }
}

module.exports = ParamedicApp;
