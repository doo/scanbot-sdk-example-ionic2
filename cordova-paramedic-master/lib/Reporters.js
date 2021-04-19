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

const { SpecReporter } = require('jasmine-spec-reporter');
const jasmineReporters = require('jasmine-reporters');

class ParamedicReporter {
    constructor (callback) {
        this.allDoneCallback = callback;
        this.failed = false;
    }

    specDone (spec) {
        if (spec.status === 'failed') {
            this.failed = true;
        }
    }

    jasmineDone () {
        if (this.allDoneCallback instanceof Function) {
            this.allDoneCallback(!this.failed);
        }
    }
}

const getReporters = function (outputDir) {
    let reporters = [new SpecReporter({ displayPendingSummary: false, displaySuiteNumber: true })];

    if (outputDir) {
        reporters.push(new jasmineReporters.JUnitXmlReporter({ savePath: outputDir, consolidateAll: false }));
    }

    return reporters;
};

module.exports = { ParamedicReporter, getReporters };
