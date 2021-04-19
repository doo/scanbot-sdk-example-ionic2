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

const DEFAULT_START_PORT = 7008;
const DEFAULT_END_PORT = 7208;
const DEFAULT_TIMEOUT = 60 * 60 * 1000; // 60 minutes in msec - this will become a param
const DEFAULT_SAUCE_DEVICE_NAME_ANDROID = 'Android GoogleAPI Emulator';
const DEFAULT_SAUCE_PLATFORM_VERSION_ANDROID = '8.0';
const DEFAULT_SAUCE_DEVICE_NAME_IOS = 'iPhone Simulator';
const DEFAULT_SAUCE_PLATFORM_VERSION_IOS = '9.3';
const DEFAULT_SAUCE_APPIUM_VERSION = '1.9.1';
const DEFAULT_BUILD_NAME = 'Paramedic sauce test';
const DEFAULT_CLI = 'cordova'; // use globally installed cordova by default

const { utilities } = require('./utils');

class ParamedicConfig {
    constructor (json) {
        this._config = json;
    }

    getDefaultSauceDeviceName () {
        if (this.getPlatformId() === utilities.ANDROID) {
            return DEFAULT_SAUCE_DEVICE_NAME_ANDROID;
        } else if (this.getPlatformId() === utilities.IOS) {
            return DEFAULT_SAUCE_DEVICE_NAME_IOS;
        } else {
            throw new Error('Don\'t know a default device name for platform: ' + this.getPlatformId());
        }
    }

    getDefaultSaucePlatformVersion () {
        if (this.getPlatformId() === utilities.ANDROID) {
            return DEFAULT_SAUCE_PLATFORM_VERSION_ANDROID;
        } else if (this.getPlatformId() === utilities.IOS) {
            return DEFAULT_SAUCE_PLATFORM_VERSION_IOS;
        } else {
            throw new Error('Don\'t know a default platform version for platform: ' + this.getPlatformId());
        }
    }

    getUseTunnel () {
        return this._config.useTunnel;
    }

    setUseTunnel (useTunnel) {
        this._config.useTunnel = useTunnel;
    }

    getOutputDir () {
        return this._config.outputDir;
    }

    setOutputDir (outputDir) {
        this._config.outputDir = outputDir;
    }

    shouldCleanUpAfterRun () {
        return this._config.cleanUpAfterRun;
    }

    getPlatform () {
        return this._config.platform;
    }

    setPlatform (platform) {
        this._config.platform = platform;
    }

    getAction () {
        return this._config.action;
    }

    setAction (action) {
        this._config.action = action;
    }

    getArgs () {
        if (this._config.args) {
            return this._config.args;
        } else {
            return '';
        }
    }

    setArgs (args) {
        this._config.args = args;
    }

    getPlatformId () {
        return this._config.platform.split('@')[0];
    }

    getPlugins () {
        return this._config.plugins;
    }

    setPlugins (plugins) {
        this._config.plugins = Array.isArray(plugins) ? plugins : [plugins];
    }

    getExternalServerUrl () {
        return this._config.externalServerUrl;
    }

    isVerbose () {
        return this._config.verbose;
    }

    isJustBuild () {
        return this._config.justbuild;
    }

    shouldUseSauce () {
        return this._config.shouldUseSauce;
    }

    setShouldUseSauce (sus) {
        this._config.shouldUseSauce = sus;
    }

    shouldUseAndroidx () {
        return this._config.shouldUseAndroidx;
    }

    setshouldUseAndroidx (value) {
        this._config.shouldUseAndroidx = value;
    }

    getBuildName () {
        return this._config.buildName || this.getDefaultBuildName();
    }

    setBuildName (buildName) {
        this._config.buildName = buildName;
    }

    getDefaultBuildName () {
        return DEFAULT_BUILD_NAME + ' ' + Date.now();
    }

    getSauceUser () {
        return this._config.sauceUser || process.env[utilities.SAUCE_USER_ENV_VAR];
    }

    setSauceUser (sauceUser) {
        this._config.sauceUser = sauceUser;
    }

    getSauceKey () {
        return this._config.sauceKey || process.env[utilities.SAUCE_KEY_ENV_VAR];
    }

    setSauceKey (sauceKey) {
        this._config.sauceKey = sauceKey;
    }

    getSauceDeviceName () {
        return this._config.sauceDeviceName || this.getDefaultSauceDeviceName();
    }

    setSauceDeviceName (sauceDeviceName) {
        this._config.sauceDeviceName = sauceDeviceName.toString();
    }

    getSaucePlatformVersion () {
        return this._config.saucePlatformVersion || this.getDefaultSaucePlatformVersion();
    }

    setSaucePlatformVersion (saucePlatformVersion) {
        this._config.saucePlatformVersion = saucePlatformVersion.toString();
    }

    getSauceAppiumVersion () {
        return this._config.sauceAppiumVersion || DEFAULT_SAUCE_APPIUM_VERSION;
    }

    setSauceAppiumVersion (sauceAppiumVersion) {
        this._config.sauceAppiumVersion = sauceAppiumVersion.toString();
    }

    getSauceTunnelId () {
        if (typeof this._config.sauceTunnelId === 'boolean') {
            this._config.sauceTunnelId = undefined;
        }
        return this._config.sauceTunnelId;
    }

    setSauceTunnelId (tid) {
        this._config.sauceTunnelId = tid;
    }

    runMainTests () {
        return !this._config.skipMainTests;
    }

    setSkipMainTests (skipMainTests) {
        this._config.skipMainTests = skipMainTests;
    }

    runAppiumTests () {
        return !this._config.skipAppiumTests;
    }

    setSkipAppiumTests (skipAppiumTests) {
        this._config.skipAppiumTests = skipAppiumTests;
    }

    getPorts () {
        return {
            start: this._config.startPort || DEFAULT_START_PORT,
            end: this._config.endPort || DEFAULT_END_PORT
        };
    }

    getTimeout () {
        return DEFAULT_TIMEOUT;
    }

    getLogMins () {
        return this._config.logMins;
    }

    setLogMins (logMins) {
        this._config.logMins = logMins;
    }

    setTccDb (tccDb) {
        this._config.tccDb = tccDb;
    }

    getTccDb () {
        return this._config.tccDb;
    }

    isCI () {
        return this._config.ci;
    }

    setCI (isCI) {
        this._config.ci = isCI;
    }

    getTarget () {
        return this._config.target;
    }

    setTarget (target) {
        this._config.target = target;
    }

    getFileTransferServer () {
        return this._config.fileTransferServer;
    }

    setFileTransferServer (server) {
        this._config.fileTransferServer = server;
    }

    getCli () {
        if (this._config.cli) {
            return this._config.cli;
        }
        return DEFAULT_CLI;
    }

    setCli (cli) {
        this._config.cli = cli;
    }

    getAll () {
        return this._config;
    }
}

ParamedicConfig.parseFromArguments = function (argv) {
    return new ParamedicConfig({
        platform: argv.platform,
        action: argv.justbuild || argv.justBuild ? 'build' : 'run',
        args: '',
        plugins: Array.isArray(argv.plugin) ? argv.plugin : [argv.plugin],
        useTunnel: !!argv.useTunnel,
        verbose: !!argv.verbose,
        startPort: argv.startport || argv.port,
        endPort: argv.endport || argv.port,
        externalServerUrl: argv.externalServerUrl,
        outputDir: argv.outputDir ? argv.outputDir : null,
        logMins: argv.logMins ? argv.logMins : null,
        tccDb: argv.tccDbPath ? argv.tccDb : null,
        cleanUpAfterRun: !!argv.cleanUpAfterRun,
        shouldUseSauce: !!argv.shouldUseSauce || false,
        buildName: argv.buildName,
        sauceUser: argv.sauceUser,
        sauceKey: argv.sauceKey,
        sauceDeviceName: argv.sauceDeviceName && argv.sauceDeviceName.toString(),
        saucePlatformVersion: argv.saucePlatformVersion && argv.saucePlatformVersion.toString(),
        sauceAppiumVersion: argv.sauceAppiumVersion && argv.sauceAppiumVersion.toString(),
        sauceTunnelId: argv.sauceTunnelId,
        skipAppiumTests: argv.skipAppium,
        skipMainTests: argv.skipMainTests,
        ci: argv.ci,
        target: argv.target,
        fileTransferServer: argv.fileTransferServer,
        cli: argv.cli,
        shouldUseAndroidx: !!argv.shouldUseAndroidx || false
    });
};

ParamedicConfig.parseFromFile = function (paramedicConfigPath) {
    return new ParamedicConfig(require(paramedicConfigPath));
};

module.exports = ParamedicConfig;
