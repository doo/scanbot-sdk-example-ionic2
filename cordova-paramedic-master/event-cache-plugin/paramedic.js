/* global jasmine, cordova */
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

/* global window */

// CB-11430 Inject SAUCELABS_ENV global variable to indicate we're running on Saucelabs
window.SAUCELABS_ENV = true;

function Paramedic() {

}

Paramedic.prototype.initialize = function() {
    this.injectJasmineReporter();
};

Paramedic.prototype.injectJasmineReporter = function () {
    var EventCache = require('cordova-plugin-paramedic-event-cache.EventCache');
    var eventCache = new EventCache();
    var testsModule = cordova.require("cordova-plugin-test-framework.cdvtests");
    var defineAutoTestsOriginal = testsModule.defineAutoTests;

    testsModule.defineAutoTests = function () {
        defineAutoTestsOriginal();
        jasmine.getEnv().addReporter(eventCache);
    };
};

new Paramedic().initialize();

module.exports = Paramedic;
