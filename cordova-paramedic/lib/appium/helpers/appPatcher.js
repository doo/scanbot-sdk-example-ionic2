/*
 *
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
 *
*/

const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const { utilities, logger } = require('../../utils');
const { ConfigParser } = require('cordova-common');
const getConfigParser = (appPath) => new ConfigParser(path.join(appPath, 'config.xml'));

module.exports.permitAccess = function (appPath, origin) {
    const config = getConfigParser(appPath);
    const accesses = config.getAccesses();
    let accessPresent = false;

    logger.normal('paramedic-appium: Adding a whitelist "access" rule for origin: ' + origin);
    accesses.forEach((access) => {
        if (access.origin === origin) accessPresent = true;
    });

    if (accessPresent) {
        logger.normal('paramedic-appium: It is already in place');
    } else {
        config.addElement('access', { origin: origin });
        config.write();
    }
};

module.exports.addCspSource = function (appPath, directive, source) {
    const cspInclFile = path.join(appPath, 'www', 'csp-incl.js');
    const indexFile = path.join(appPath, 'www', 'index.html');
    const cspFile = fs.existsSync(cspInclFile) ? cspInclFile : indexFile;
    let cspContent = fs.readFileSync(cspFile, utilities.DEFAULT_ENCODING);
    const cspTagOpening = '<meta http-equiv="Content-Security-Policy" content=\'';
    const cspRule = directive + ' ' + source;
    const cspRuleReg = new RegExp(directive + '[^;"]+' + source.replace('*', '\\*'));

    logger.normal('paramedic-appium: Adding CSP source "' + source + '" to directive "' + directive + '"');

    if (cspContent.match(cspRuleReg)) {
        logger.normal('paramedic-appium: It\'s already there.');
    } else if (utilities.contains(cspContent, directive)) {
        // if the directive is there, just add the source to it
        cspContent = cspContent.replace(directive, cspRule);
        fs.writeFileSync(cspFile, cspContent, utilities.DEFAULT_ENCODING);
    } else if (cspContent.match(/content=".*?default-src.+?"/)) {
        // needed directive is not there but there is default-src directive
        // creating needed directive and copying default-src sources to it
        const defaultSrcReg = /(content=".*?default-src)(.+?);/;
        cspContent = cspContent.replace(defaultSrcReg, '$1$2; ' + cspRule + '$2;');
        fs.writeFileSync(cspFile, cspContent, utilities.DEFAULT_ENCODING);
    } else if (utilities.contains(cspContent, cspTagOpening)) {
        // needed directive is not there and there is no default-src directive
        // but the CSP tag is till present
        // just adding needed directive to a start of CSP tag content
        cspContent = cspContent.replace(cspTagOpening, cspTagOpening + directive + ' ' + source + '; ');
        fs.writeFileSync(cspFile, cspContent, utilities.DEFAULT_ENCODING);
    } else {
        // no CSP tag, skipping
        logger.normal('paramedic-appium: WARNING: No CSP tag found.');
    }
};

module.exports.setPreference = function (appPath, preference, value) {
    const config = getConfigParser(appPath);
    logger.normal(`paramedic-appium: Setting "${preference}" preference to "${value}"`);
    config.setGlobalPreference(preference, value);
    config.write();
};

module.exports.monkeyPatch = function (file, regex, replacement) {
    try {
        // returns true if the sed has results.
        return shell.sed('-i', regex, replacement, file).indexOf(replacement) >= 0;
    } catch (err) {
        logger.warn(`cordova-paramedic: something went wrong while monkey patching ${file}:\n${err.stack}`);
    }
};
