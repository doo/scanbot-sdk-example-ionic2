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

var parseArgs       = require('minimist');
var path            = require('path');
var paramedic       = require('./lib/paramedic');
var ParamedicConfig = require('./lib/ParamedicConfig');
var util            = require('./lib/utils').utilities;

var USAGE           = "Error missing args. \n" +
    "\n" +
    "cordova-paramedic --platform PLATFORM --plugin PATH [--justbuild --timeout MSECS --startport PORTNUM --endport PORTNUM --version ...]\n" +
    "\n" +
    "--platform PLATFORM : the platform id. Currently supports 'ios', 'browser', 'windows', 'android'.\n" +
                    "\tPath to platform can be specified as link to git repo like:\n" +
                    "\twindows@https://github.com/apache/cordova-windows.git\n" +
                    "\tor path to local copied git repo like:\n" +
                    "\twindows@../cordova-windows/\n" +
    "--plugin PATH : the relative or absolute path to a plugin folder\n" +
                    "\texpected to have a 'tests' folder.\n" +
                    "\tYou may specify multiple --plugin flags and they will all\n" +
                    "\tbe installed and tested together.\n" +
    "\n" +
    "--args: (optional) add command line args to the \"cordova build\" and \"cordov run\" commands \n" +
    "--buildName : (optional) Build name to show in Saucelabs dashboard\n" +
    "--ci : (optional) Skip tests that require user interaction\n" +
    "--cleanUpAfterRun : (optional) cleans up the application after the run\n" +
    "--cli : (optional) A path to Cordova CLI\n" +
    "--config : (optional) read configuration from paramedic configuration file\n" +
    "--fileTransferServer : (optional) (cordova-plugin-file-transfer only) A server address tests should connect to\n" +
    "--justbuild : (optional) just builds the project, without running the tests \n" +
    "--logMins : (optional) Windows only - specifies number of minutes to get logs\n" +
    "--outputDir : (optional) path to save Junit results file & Device logs\n" +
    "--sauceAppiumVersion : (optional) Appium version to use when running on Saucelabs. For example, \"1.5.3\"\n" +
    "--sauceDeviceName : (optional) Name of the SauceLabs emulator/browser. For example, \"iPhone Simulator\" or \"firefox\"\n" +
    "--sauceKey : (optional) Saucelabs access key\n" +
    "--saucePlatformVersion : (optional) Version of the emulator OS or version of the browser. For example, \"9.3\" or \"54.0\"\n" +
    "--sauceTunnelId : (optional) Tunnel identifier to use. Only usable if you have Sauce Connect up\n" + 
    "--sauceUser : (optional) Saucelabs username\n" +
    "--shouldUseSauce : (optional) run tests on Sauce Labs\n" +
    "--skipAppiumTests : (optional) Do not run Appium tests\n" +
    "--skipMainTests : (optional) Do not run main (cordova-test-framework) tests\n" +
    "--startport/--endport `PORTNUM` : (optional) ports to find available and use for posting results from emulator back to paramedic server (default is from 8008 to 8009)\n" +
    "--target : (optional) target to deploy to\n" +
    "--tccDb : (optional) iOS only - specifies the path for the TCC.db file to be copied.\n" +
    "--timeout `MSECS` : (optional) time in millisecs to wait for tests to pass|fail \n" +
                "\t(defaults to 10 minutes) \n" +
    "--useTunnel: (optional) use tunneling instead of local address. default is false\n" +
    "--verbose : (optional) verbose mode. Display more information output\n" +
    "--version : (optional) prints cordova-paramedic version and exits\n" +
    "";

var argv = parseArgs(process.argv.slice(2), {
    "string": ["plugin"]
});
var pathToParamedicConfig = util.getConfigPath(argv.config);

if (argv.version) {
    console.log(require('./package.json')['version']);
    process.exit(0);
} else if (pathToParamedicConfig || // --config
    argv.platform && argv.plugin) { // or --platform and --plugin

    var paramedicConfig = pathToParamedicConfig ?
        ParamedicConfig.parseFromFile(pathToParamedicConfig):
        ParamedicConfig.parseFromArguments(argv);

    if (argv.justBuild || argv.justbuild) {
        paramedicConfig.setAction('build');
    }

    if (argv.plugin) {
        paramedicConfig.setPlugins(argv.plugin);
    }

    if (argv.outputDir) {
        paramedicConfig.setOutputDir(argv.outputDir);
    }

    if (argv.logMins) {
        paramedicConfig.setLogMins(argv.logMins);
    }

    if (argv.tccDb){
        paramedicConfig.setTccDb(argv.tccDb);
    }

    if (argv.platform) {
        paramedicConfig.setPlatform(argv.platform);
    }

    if (argv.action) {
        paramedicConfig.setAction(argv.action);
    }

    if (argv.shouldUseSauce) {
        if (argv.shouldUseSauce === 'false') {
            argv.shouldUseSauce = false;
        }
        paramedicConfig.setShouldUseSauce(argv.shouldUseSauce);
    }

    if (argv.buildName) {
        paramedicConfig.setBuildName(argv.buildName);
    }

    if (argv.sauceUser) {
        paramedicConfig.setSauceUser(argv.sauceUser);
    }

    if (argv.sauceKey) {
        paramedicConfig.setSauceKey(argv.sauceKey);
    }

    if (argv.sauceDeviceName) {
        paramedicConfig.setSauceDeviceName(argv.sauceDeviceName);
    }

    if (argv.saucePlatformVersion) {
        paramedicConfig.setSaucePlatformVersion(argv.saucePlatformVersion);
    }

    if (argv.sauceAppiumVersion) {
        paramedicConfig.setSauceAppiumVersion(argv.sauceAppiumVersion);
    }

    if (argv.sauceTunnelId) {
        paramedicConfig.setSauceTunnelId(argv.sauceTunnelId);
    }

    if (argv.useTunnel) {
        if (argv.useTunnel === 'false') {
            argv.useTunnel = false;
        }
        paramedicConfig.setUseTunnel(argv.useTunnel);
    }

    if (argv.skipMainTests) {
        paramedicConfig.setSkipMainTests(argv.skipMainTests);
    }

    if (argv.skipAppiumTests) {
        paramedicConfig.setSkipAppiumTests(argv.skipAppiumTests);
    }

    if (argv.ci) {
        paramedicConfig.setCI(argv.ci);
    }

    if (argv.target) {
        paramedicConfig.setTarget(argv.target);
    }

    if (argv.fileTransferServer) {
        paramedicConfig.setFileTransferServer(argv.fileTransferServer);
    }

    if (argv.cli) {
        paramedicConfig.setCli(argv.cli);
    }

    if (argv.args) {
        paramedicConfig.setArgs(argv.args);
    }

    paramedic.run(paramedicConfig)
    .catch(function (error) {
        if (error && error.stack) {
            console.error(error.stack);
        } else if (error) {
            console.error(error);
        }
        process.exit(1);
    })
    .done(function(isTestPassed) {
        var exitCode = isTestPassed ? 0 : 1;

        console.log('Finished with exit code ' + exitCode);
        process.exit(exitCode);
    });

} else {
    console.log(USAGE);
    process.exit(1);
}
