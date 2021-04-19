'use strict';

var wdHelper = global.WD_HELPER;
var screenshotHelper = global.SCREENSHOT_HELPER;

var MINUTE = 60 * 1000;

describe('Testable Plugin UI Automation Tests', function () {
    var driver;
    var webviewContext;
    var promiseCount = 0;
    // going to set this to false if session is created successfully
    var failedToStart = true;

    function getNextPromiseId() {
        return 'appium_promise_' + promiseCount++;
    }

    function saveScreenshotAndFail(error) {
        fail(error);
        return screenshotHelper
            .saveScreenshot(driver)
            .quit()
            .then(function () {
                return getDriver();
            });
    }

    function getDriver() {
        driver = wdHelper.getDriver(PLATFORM);
        return wdHelper.getWebviewContext(driver, 2)
            .then(function (context) {
                webviewContext = context;
                return driver.context(webviewContext);
            })
            .then(function () {
                return wdHelper.waitForDeviceReady(driver);
            })
            .then(function () {
                return wdHelper.injectLibraries(driver);
            });
    }
    
        function checkSession(done) {
        if (failedToStart) {
            fail('Failed to start a session');
            done();
        }
    }

    afterAll(function (done) {
        checkSession(done);
        driver
            .quit()
            .done(done);
    }, MINUTE);

    it('should connect to an appium endpoint properly', function (done) {
        // retry up to 3 times
        getDriver()
            .fail(function () {
                return getDriver()
                    .fail(function () {
                        return getDriver()
                            .fail(fail);
                    });
            })
            .then(function () {
                failedToStart = false;
            }, fail)
            .then(function () {
                var promiseId = getNextPromiseId();
                return driver
                    .context(webviewContext)
                    .execute(function (pID) {
                        navigator._appiumPromises[pID] = Q.defer();
                        return Q.fcall(function () {
                            return 'success';
                        })
                        .then(function (result) {
                            navigator._appiumPromises[pID].resolve(result);
                        }, function (err) {
                            navigator._appiumPromises[pID].reject(err);
                        });
                    }, [promiseId])
                    .executeAsync(function (pID, cb) {
                        navigator._appiumPromises[pID].promise
                            .then(function (result) {
                                cb(result);
                            }, function (err) {
                                cb('ERROR: ' + err);
                            });
                    }, [promiseId])
                    .then(function (result) {
                        if (typeof result === 'string' && result.indexOf('ERROR:') === 0) {
                            throw result;
                        }
                        return result;
                    });
            })
            .done(done);
    }, 30 * MINUTE);
});
