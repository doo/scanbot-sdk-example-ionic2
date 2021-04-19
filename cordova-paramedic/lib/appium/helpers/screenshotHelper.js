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

const path = require('path');

function generateScreenshotName () {
    const date = new Date();

    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hour = date.getHours();
    let min = date.getMinutes();
    let sec = date.getSeconds();

    month = (month < 10 ? '0' : '') + month;
    day = (day < 10 ? '0' : '') + day;
    hour = (hour < 10 ? '0' : '') + hour;
    min = (min < 10 ? '0' : '') + min;
    sec = (sec < 10 ? '0' : '') + sec;

    return `${date.getFullYear()}-${month}-${day}_${hour}.${min}.${sec}.png'`;
}

module.exports.saveScreenshot = function (driver) {
    let oldContext;
    return driver
        .currentContext()
        .then((cc) => {
            oldContext = cc;
        })
        .context('NATIVE_APP')
        .saveScreenshot(path.join(global.SCREENSHOT_PATH, generateScreenshotName()))
        .then(() => driver.context(oldContext));
};
