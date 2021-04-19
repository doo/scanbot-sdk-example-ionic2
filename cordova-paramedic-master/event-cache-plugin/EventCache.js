/* global window, cordova, device */
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

var platformMap = {
    'ipod touch':'ios',
    'iphone':'ios'
};

function JasmineParamedicProxy() {
    this.specExecuted = 0;
    this.specFailed = 0;
    window._jasmineParamedicProxyCache = [];
}

function cacheEvent (eventName, eventObject) {
    window._jasmineParamedicProxyCache.push({
        eventName: eventName,
        eventObject: eventObject
    });
}

JasmineParamedicProxy.prototype.jasmineStarted = function (o) {
    cacheEvent('jasmineStarted', o);
};

JasmineParamedicProxy.prototype.specStarted = function (o) {
    cacheEvent('specStarted', o);
};

JasmineParamedicProxy.prototype.specDone = function (o) {
    if (o.status !== 'disabled') {
        this.specExecuted++;
    }
    if (o.status === 'failed') {
        this.specFailed++;
    }

    cacheEvent('specDone', o);
};

JasmineParamedicProxy.prototype.suiteStarted = function (o) {
    cacheEvent('suiteStarted', o);
};

JasmineParamedicProxy.prototype.suiteDone = function (o) {
    cacheEvent('suiteDone', o);
};

JasmineParamedicProxy.prototype.jasmineDone = function (o) {
    var p = 'Desktop';
    var devmodel = 'none';
    var version = cordova.version;
    if (typeof device !== 'undefined') {
        p = device.platform.toLowerCase();
        devmodel = device.model || device.name;
        version = device.version.toLowerCase();
    }

    o = o || {};

    // include platform info
    /*o.cordova = {
        platform: (platformMap.hasOwnProperty(p) ? platformMap[p] : p),
        version: version,
        model: devmodel
    };*/

    // include common spec results
    o.specResults = {
        specExecuted : this.specExecuted,
        specFailed   : this.specFailed
    };

    cacheEvent('jasmineDone', o);
};

module.exports = JasmineParamedicProxy;
