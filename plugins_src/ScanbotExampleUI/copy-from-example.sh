#!/bin/bash

# Copies Plugin iOS source files from Example Project
IOS_SRC="../../platforms/ios/Scanbot SDK Example Ionic/Plugins/cordova-plugin-scanbot-example-ui/"
IOS_DEST="./src/ios"
rsync -rluv "$IOS_SRC" "$IOS_DEST"

# Copies Plugin Android source files from Example Project
ANDROID_SRC="../../platforms/android/app/src/main/java/io/scanbot/cordova/exampleui/"
ANDROID_DEST="src/android"
rsync -rluv "$ANDROID_SRC" "$ANDROID_DEST"

