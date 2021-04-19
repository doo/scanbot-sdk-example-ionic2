[![Build Status](https://travis-ci.org/apache/cordova-paramedic.svg?branch=master)](https://travis-ci.org/apache/cordova-paramedic)
[![Build status](https://ci.appveyor.com/api/projects/status/iufmfjo0j0dd4c1w?svg=true)](https://ci.appveyor.com/project/ApacheSoftwareFoundation/cordova-paramedic)

> Paramedic • _noun_ provides advanced levels of care at the point of illness or injury, including out of hospital treatment, and diagnostic services

# Cordova Paramedic (Test Automation)

`cordova-paramedic` is a tool to automate execution of Cordova plugins tests (via [`cordova-plugin-test-framework`](https://github.com/apache/cordova-plugin-test-framework)).

You can use Paramedic to build and run a Cordova app with plugin tests, run these tests on local and remote emulators on [Sauce Labs](https://saucelabs.com/), and report the results. It can be used on a local or Continuous Integration environment.

Cordova Paramedic is currently used to automatically run all plugin tests on CI.

(See this [workshop instructions for some additional explanation](https://kerrishotts.github.io/pgday/workshops/2017/campp/testing.html#cordova-paramedic).)

## Table of Contents

- [Supported Cordova Platforms](#supported-cordova-platforms)
- [What does it do?](#what-does-it-do)
- [Installation](#installation)
- [Usage](#usage)
  * [Common usages](#common-usages)
- [Command Line Interface](#command-line-interface)
  * [What to build and test](#what-to-build-and-test)
  * [Emulator/Device to use for tests](#emulatordevice-to-use-for-tests)
  * [Test Result Server](#test-result-server)
  * [Test Configuration](#test-configuration)
  * [Sauce Labs](#sauce-labs)
- [Configuration file](#configuration-file)
- [API Interface](#api-interface)
- [Quirks](#quirks)
  * [Windows](#windows)

<!--<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>-->

## Supported Cordova Platforms

- Android
- iOS
- Windows
- Browser

## What does it do?

A full Paramedic run will:

1. <details>
    <summary>Create and prepare the app</summary>

    1. Create a temporary Cordova project with `cordova create`
    1. Install various plugins with `cordova plugin add %local_path%` (e.g. `cordova plugin add ../cordova-plugin-inappbrowser`):
        - the plugin to be tested (e.g. `../cordova-plugin-inappbrowser`)
        - the tests of this plugin (e.g. `../cordova-plugin-inappbrowser/tests`)
        - `cordova-plugin-test-framework` (from npm)
        - local `paramedic-plugin`
    1. Update the app start page to the test page at `cdvtests/index.html` (provided by `cordova-plugin-test-framework` and the plugin tests)
    1. Add the platform to be tested with `cordova platform add ...`
    1. Confirm the requirements for that platform are met with `cordova requirements ...`
    1. Start a local socket server for communication between the app running on a device/emulator and paramedic
    1. Make the server address known to the app
    </details>
1. Run the tests <!-- 2-99 -->
    - <details>
      <summary>Either run the main tests locally...  <!-- 5-316 --></summary>

        1. Skip main tests if option set (platform != android) <!-- 5-322 -->
        1. Start a file transfer server if required
        1. Get the test command for the platform
        1. Manipulate permissions on iOS
        1. Run the app (open in browser, start emulator, run on device or emulator) and start the tests by doing so
        1. Skip main tests if option set <!-- 6-350 -->
        1. Skip tests if action = run|emulate (= build) <!-- 6-356 -->
        1. Wait for device to connect to server before timeout <!-- 6-359 -->
        1. Wait for the tests results <!-- 6-361-->
            1. Time out if "connection takes to long" TODO (failure) <!-- 8-479-->
            1. Receive and handle "tests are done" (success) and "device disconnected" (failure) events <!-- 8-485-->
        1. (browser) Close the running browser <!-- 6-368 -->
        1. Run the Appium tests (with sauce = false) <!-- 7-465 -->
        </details>
    - <details>
      <summary>... or on Sauce Labs</summary>

        1. Build, package and upload the app to Sauce Labs or (platform = browser) open the app in a browser
        1. (platform = browser) Connect to Sauce Connect (Proxy)
        1. Connect to Web Driver on Sauce Labs
        1. Navigate Web Driver to correct page (browser) or webview (apps)
        1. Click "Auto Tests" if a plugin `*wkwebview*` is installed
        1. Find out if the "permission buster" should be skipped (plugins splashscreen or inappbrowser, browser): `skipBuster`
        1. Start polling in the background for events using the Web Driver (submitting `skipBuster` as well) every 2.5 seconds
        1. Wait for the tests results
            1. Time out if "connection takes to long" TODO (failure)  <!-- 8-479-->
            1. Receive and handle "tests are done" (success) and "device disconnected" (failure) events<!-- 8-485-->
        1. Log success or failure
        1. Quit Web Driver
        1. (platform = browser) Close the open browser <!-- 16-1056 -->
        1. Close connection to Sauce Connect (Proxy)
        1. Run the Appium tests on Sauce Labs (with sauce = true) <!-- 7-454 -->
        </details>
    - <details>
      <summary>Run the Appium tests <!-- 6-379 --></summary>

        1. Skip if action = build <!-- 6-384 -->
        1. Skip is Appium should be skipped <!-- 6-388 -->
        1. Skip if platform != android or ios <!-- 6-392 -->
        1. !sauce: Error when no targetObj TODO <!-- 6-397 -->
        1. Create Appium options <!-- 7-403 -->
        1. Create AppiumRunner with options <!-- 7-426 -->
            1. Prepare the submitted options <!-- AppiumRunner 151 -->
            1. Create screenshot directory <!-- AppiumRunner 147 -->
            1. Find the tests in plugin paths <!-- AppiumRunner 307 -->
            1. Set globals for the tests <!-- AppiumRunner 334 -->
        1. Skip if no Appium tests were found <!-- 7-427 -->  
        1. Prepare App in AppiumRunner <!-- 7-433 -->
            1. Remove server address from app
            2. Reconfigure app (modify preferences + CSP, add plugin) <!-- 367, 375, 385 -- >
            3. Build app
        1. (sauce) Package and Upload the App to Sauce Labs <!-- 7-436 -->
        1. Run tests via AppiumRunner <!-- 7-442 -->
            1. (!sauce) Start iOS Proxy (`ios_webkit_debug_proxy`) <!-- AppiumRunner 231 -->
            1. (!sauce) Install (`npm install appium`) <!-- AppiumRunner 231 --> and start Appium server <!-- AppiumRunner 252 -->
            1. Start to run the Appium tests <!-- AppiumRunner 170 -->
            1. Handle eventual exceptions, return the result
      </details>
1. <details>
    <summary>Clean up</summary>

    1. (!sauce) <!-- 2-107 -->
        1. Handle timeouts of test execution above
        1. Collect Device Logs
        1. Uninstall App
        1. Kill Emulator Process
    1. (sauce) Display Sauce run details <!-- 2-118 -->
    1. Clean up Project <!-- 2-121 -->
    </details>

## Installation

```
npm install -g cordova-paramedic

# or

git clone https://github.com/apache/cordova-paramedic
# when cloning, you have to run `npm link` inside the checkout
# or replace all occurences of `cordova-paramedic` in commands with `cordova-paramedic/main.js`
# or `node cordova-paramedic/main.js` (on Windows)
```

## Usage

Paramedic parameters can be passed via command line arguments or via separate configuration file:

```
cordova-paramedic --platform PLATFORM --plugin PATH <other parameters>
cordova-paramedic --config ./sample-config/.paramedic.config.js
```

### Common usages

Some common use cases of Paramedic:

```
# Run without any parameters to get a list of supported parameters
cordova-paramedic

# Test your current plugin on an Android emulator
cordova-paramedic --platform android --plugin ./

# Test your current plugin on a specific Android device (ID via `adb devices -l`)
cordova-paramedic --platform android --plugin ./ --target 02e7f7e9215da7f8 --useTunnel

# Test your current plugin on an Android 7.0 emulator on Sauce Labs
cordova-paramedic --config conf/pr/android-7.0 --plugin ./
```

## Command Line Interface

### What to build and test

#### `--platform` (required)

Specifies target Cordova platform (could refer to local directory, npm or git)

```
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser
cordova-paramedic --platform ios@4.0 --plugin cordova-plugin-inappbrowser
cordova-paramedic --platform ios@../cordova-ios --plugin cordova-plugin-inappbrowser
cordova-paramedic --platform ios@https://github.com/apache/cordova-ios.git#4.1.0 --plugin cordova-plugin-inappbrowser
```

#### `--plugin` (required)

Specifies test plugin, you may specify multiple `--plugin` flags and they will all be installed and tested together. You can refer to absolute path, npm registry or git repo.
If the plugin requires variables to install, you can specify them along with its name.

```
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser
cordova-paramedic --platform ios --plugin 'azure-mobile-engagement-cordova --variable AZME_IOS_CONNECTION_STRING=Endpoint=0;AppId=0;SdkKey=0'
cordova-paramedic --platform ios --plugin https://github.com/apache/cordova-plugin-inappbrowser
// several plugins
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser --plugin cordova-plugin-contacts
```

#### `--verbose` (optional)

Verbose mode. Display more information output

```
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser --verbose
```

#### `--cli` (optional)

A path to Cordova CLI. Useful when you're testing against locally installed Cordova version.

```
cordova-paramedic --platform android --plugin cordova-plugin-device --cli ./cordova-cli/bin/cordova
```

#### `--justbuild` (optional)

Just builds the project, without running the tests.

```
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser --justbuild
```

### Emulator/Device to use for tests

#### `--target` (optional)

For Android: The device ID (from `adb devices -l`) of a device the tests should be run on.  

```
cordova-paramedic --platform android --plugin cordova-plugin-contacts --target 02e7f7e9215da7f8
```

For iOS: A string that is used to pick the device (from the `cordova run --list --emulator` output) the tests should be run on.

```
cordova-paramedic --platform ios --plugin cordova-plugin-contacts --target "iPhone-8"
```


### Test Result Server

#### `--useTunnel` (optional)

Use a tunnel (via [`localtunnel`](https://www.npmjs.com/package/localtunnel)) instead of local address (default is false).
Useful when testing on real devices and don't want to specify external IP address (see `--externalServerUrl` below) of paramedic server.

```
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser --useTunnel
```

#### `--externalServerUrl` (optional)

Useful when testing on real device (`--device` parameter) so that tests results from device could be posted back to paramedic server.

```
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser --externalServerUrl http://10.0.8.254
```

#### `--port` (optional)

Port to use for posting results from emulator back to paramedic server (default is from `8008`). You can also specify a range using `--startport` and `endport` and paramedic will select the first available.

```
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser --port 8010
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser --startport 8000 endport 8020
```

### Test configuration

#### `--timeout` (optional)

Time in millisecs to wait for tests to pass|fail (defaults to 10 minutes).

```
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser --timeout 30000
```

#### `--outputDir` (optional)

Directory location to store test results in junit format and the device logs

```
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser --outputDir /Users/sampleuser/testresults
```

#### `--cleanUpAfterRun` (optional)

Flag to indicate the sample application folder must be deleted.

```
cordova-paramedic --platform ios --plugin cordova-plugin-inappbrowser --cleanUpAfterRun
```

#### `--logMins` (optional)

Windows only parameter to indicate the duration for which the device logs to be fetched.

```
cordova-paramedic --platform windows --plugin cordova-plugin-inappbrowser --logMins 15
```

#### `--tccDb` (optional)

iOS only parameter. The path to the sample TCC DB file, with permissions, to be copied to the simulator.

```
cordova-paramedic --platform ios --plugin cordova-plugin-contacts --tccDbPath tcc.db
```

#### `--args` (optional)

Add additional parameters to the `cordova build` and `cordova run` commands.

```
cordova-paramedic --platform ios --plugin cordova-plugin-contacts --args=--buildFlag='-UseModernBuildSystem=0'
```

### Sauce Labs

#### `--shouldUseSauce` (optional)

Run tests on [Sauce Labs](https://saucelabs.com/). You'll need to specify Sauce Labs username and access key using either `--sauceUser` and `--sauceKey` arguments or `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` environment variables.

#### `--sauceUser` (optional)

Sauce Labs username. Alternatively set via the `SAUCE_USERNAME` environment variable.

#### `--sauceKey` (optional)

Sauce Labs access key. Alternatively set via the `SAUCE_ACCESS_KEY` environment variable.

```
cordova-paramedic --platform ios --plugin cordova-plugin-contacts --shouldUseSauce --sauceUser ***** --sauceKey ***** --buildName "paramedic-test-01"
```

#### `--buildName` (optional)

Build name to show on Sauce Labs dashboard. If omitted, will use "Paramedic sauce test" and a timestamp.

#### `--sauceDeviceName` (optional)

Name of the Sauce Labs emulator or browser. For example, "iPhone Simulator" or "firefox". Please refer to the [Sauce Labs platforms list](https://saucelabs.com/platforms) to see available device names.

#### `--saucePlatformVersion` (optional)

Platform version of the Sauce Labs emulator OS, or version of the browser (if testing `browser` platform). For example, "9.3" or "54.0". Please refer to the [Sauce Labs platforms list](https://saucelabs.com/platforms) to see available platform versions.

#### `--sauceAppiumVersion` (optional)

Appium version to use when running on Sauce Labs. For example, "1.5.3".

```
cordova-paramedic --platform ios --plugin cordova-plugin-contacts --shouldUseSauce --sauceUser ***** --sauceKey ***** --sauceDeviceName 'iPad Simulator" --saucePlatformVersion 9.1 --appiumVersion 1.5.2
```

## Configuration file

Configuration file is used when no parameters are passed to `cordova-paramedic` call or explicitly specified via `--config` parameter:

```
cordova-paramedic           <- paramedic will attempt to find .paramedic.config.js in working directory
cordova-paramedic --config ./sample-config/.paramedic.config.js
```

Example configuration file is showed below.

```
module.exports = {
    // "externalServerUrl": "http://10.0.8.254",
    "useTunnel": true,
    "plugins": [
        "https://github.com/apache/cordova-plugin-inappbrowser"
    ],
    "platform": "windows",
    "action": "run",
    "args": "--archs=x64 -- --appx=uap"
}
```

More configuration file examples could be found in `sample-config` folder.

## API Interface

You can also use `cordova-paramedic` as a module directly:

```javascript
var paramedic = require('cordova-paramedic');
paramedic.run(config);
```

## Quirks

### Windows

For Paramedic to work correctly for Windows apps you'll need to allow the loopback for "HelloCordova" app using [Windows Loopback Exemption Manager](https://github.com/tiagonmas/Windows-Loopback-Exemption-Manager) ([download](https://github.com/piksel/Windows-Loopback-Exemption-Manager/releases/tag/v1.0.0.1)).

