/* global window, cordova, device, jasmine, XMLHttpRequest */
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

var io = cordova.require('cordova-plugin-paramedic.socket.io');

var PARAMEDIC_SERVER_DEFAULT_URL = 'http://127.0.0.1:8008';

function Paramedic() {

}

Paramedic.prototype.initialize = function() {
    var me = this;
    var connectionUri = me.loadParamedicServerUrl();
    this.socket = io.connect(connectionUri);

    this.socket.on('connect', function () {
        console.log('Paramedic has been successfully connected to the server');
        if (typeof device != 'undefined') me.socket.emit('deviceInfo', device);
    });

    this.overrideConsole();
    this.injectJasmineReporter();

    // indicate our presence
    window.PARAMEDIC = true;
};


Paramedic.prototype.overrideConsole = function () {

    var origConsole = window.console;
    var me = this;

    function createCustomLogger(type) {
        return function () {
            origConsole[type].apply(origConsole, arguments);

            me.socket.emit('deviceLog', { type: type, msg: Array.prototype.slice.apply(arguments) });
        };
    }
    window.console = {
        log: createCustomLogger('log'),
        warn: createCustomLogger('warn'),
        error: createCustomLogger('error'),
    };
    console.log('Paramedic console has been installed.');
};

Paramedic.prototype.injectJasmineReporter = function () {
    var JasmineParamedicProxy = require('cordova-plugin-paramedic.JasmineParamedicProxy');
    var jasmineProxy = new JasmineParamedicProxy(this.socket);
    var testsModule = cordova.require("cordova-plugin-test-framework.cdvtests");
    var defineAutoTestsOriginal = testsModule.defineAutoTests;

    testsModule.defineAutoTests = function () {
        defineAutoTestsOriginal();
        jasmine.getEnv().addReporter(jasmineProxy);
    };
};

Paramedic.prototype.loadParamedicServerUrl = function () {
    try {
        // attempt to synchronously load medic config
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "../medic.json", false);
        xhr.send(null);
        var cfg = JSON.parse(xhr.responseText);

        return cfg.logurl || PARAMEDIC_SERVER_DEFAULT_URL;

    } catch (ex) {
        console.log('Unable to load paramedic server url: ' + ex);
    }

    return PARAMEDIC_SERVER_DEFAULT_URL;
};


Paramedic.prototype.loadParamedicServerUrl = function () {
    return getMedicConfig().logurl;
};

Paramedic.prototype.loadParamedicFileServerUrl = function () {
    return getMedicConfig().fileserverurl;
};

cordova.paramedic = new Paramedic();
cordova.paramedic.initialize();

function getMedicConfig () {
    var cfg = {
        logurl: PARAMEDIC_SERVER_DEFAULT_URL
    };

    try {
        // attempt to synchronously load medic config
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "../medic.json", false);
        xhr.send(null);
        var parsedCfg = JSON.parse(xhr.responseText);
        if (parsedCfg.logurl) {
            cfg.logurl = parsedCfg.logurl;
        }
    } catch (ex) {
        console.log('Unable to load paramedic server url: ' + ex);
    }

    return cfg;
}

module.exports = Paramedic;
