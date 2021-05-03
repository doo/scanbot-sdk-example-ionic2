#!/bin/bash

#----------------------------------------------------------------------------------------------------------------------------------------------#
#                                                                                                                                              #
#   This is a drastic clean. It basically wipes everything out and reinstalls it again.                                                        #
#   This script should be used when ALL of the following conditions are met:                                                                   #
#                                                                                                                                              #
#   1. You are working with a local referenced Scanbot SDK plugin (not advisable)                                                              #
#     * the iOS Framework will be downloaded again and its contents will automatically                                                         #
#       replace those of the currently re-installed plugin (see download-ios-framework.js - you can also specify the SDK version there);       #
#     * Furthermore, the Android special build configuration, which includes the Scanbot SDK version, will be preserved, so                    #
#       that you won't have to do that everytime                                                                                               #
#                                                                                                                                              #
#   2. You are working on custom plugins (plugins_src folder) and you get weird errors even after running 'reinstall-custom-plugins.sh'        #
#     * this will keep the local reference to your custom plugins, reinstall all node modules and platforms while maintaining their version,   #
#       run prepare operations for you and a lot of other stuff;                                                                               #
#     * if you can't get it to work after this, you are the root of your problems and you can only blame yourself                              #
#                                                                                                                                              #
#----------------------------------------------------------------------------------------------------------------------------------------------#

# Comment these two lines to automatically detect the current platform versions and keep those
IOS_VERSION=6.2.0
ANDROID_VERSION=9.0.0

if [ -z ${IOS_VERSION+x} ]; then
	IOS_VERSION=`ionic cordova platform ls | egrep -io 'ios.*$' | sed 's/ios //g' | sed 's/\s*//g'`;
fi;

if [ -z ${ANDROID_VERSION+x} ]; then
	ANDROID_VERSION=`ionic cordova platform ls | egrep -io 'android.*$' | sed 's/android //g' | sed 's/\s*//g'`;
fi;

ECHO_COLOR='\033[0;32m' # Green
NUKE_COLOR='\033[1;33m' # Yellow
NC='\033[0m' # No Color

echo "${NC}\n\n• Detected iOS version: $IOS_VERSION${NC}"
echo "${NC}• Detected Android version: $ANDROID_VERSION${NC}"

DOWNLOAD_IOS_SDK=false
echo
read -p "Do you want to re-download the iOS Framework as well? (y/N): " -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    DOWNLOAD_IOS_SDK=true
fi

if [ "$DOWNLOAD_IOS_SDK" = false ] ; then
	echo "\n${ECHO_COLOR}• Let's create a backup of the iOS Framework so that we can restore it later\n${NC}"
	echo "cp -R plugins/cordova-plugin-scanbot-sdk/src/ios/Frameworks .nuke_backup"
	cp -R plugins/cordova-plugin-scanbot-sdk/src/ios/Frameworks .nuke_backup
fi

echo "\n${ECHO_COLOR}• Let's backup our package.json, in order to keep the local reference to the plugins_src folder\n${NC}"
echo "cp package.json .package-json.bak;"
cp package.json .package-json.bak;

echo "\n${ECHO_COLOR}• Let's also save our custom build gradle configuration\n${NC}"

echo "cp plugins/cordova-plugin-scanbot-sdk/src/android/build.gradle .original_build_gradle";
cp plugins/cordova-plugin-scanbot-sdk/src/android/build.gradle .original_build_gradle

echo "cp platforms/android/cordova-plugin-scanbot-sdk/ionic-build-extras-sb.gradle .original_build_extras";
cp platforms/android/cordova-plugin-scanbot-sdk/ionic-build-extras-sb.gradle .original_build_extras

echo "\n${NUKE_COLOR}• LET'S START NUKING =)\n${NC}";

echo "${ECHO_COLOR}• Removing both platforms...\n${NC}";
echo  "ionic cordova platform remove ios";
echo  "ionic cordova platform remove android";
ionic cordova platform remove ios;
ionic cordova platform remove android;

echo "\n${ECHO_COLOR}• Removing platforms folder...\n${NC}";
echo "rm -rf platforms/"
rm -rf platforms/

echo "\n${ECHO_COLOR}• Removing node modules folder...\n${NC}";
echo "rm -rf node_modules/"
rm -rf node_modules/

echo "\n${ECHO_COLOR}• Removing plugins folder...\n${NC}";
echo "rm -rf plugins/"
rm -rf plugins/

echo "\n${ECHO_COLOR}• Bye bye npm cache\n${NC}";
echo "npm cache clean --force";
npm cache clean --force

echo "\n${ECHO_COLOR}• And bye bye package-lock.json\n${NC}"
echo "rm -f package-lock.json";
rm -f package-lock.json

echo "\n${ECHO_COLOR}• Now we can start a new adventure.${NC}";

echo "${ECHO_COLOR}• First we restore our package JSON\n${NC}";
echo "rm package.json; mv .package-json.bak package.json;"
rm package.json; mv .package-json.bak package.json;

echo "\n${ECHO_COLOR}• Let's install those node packages again...\n${NC}";
echo "npm install";
npm install;

echo "\n${ECHO_COLOR}• Let's add our custom plugins...\n${NC}";
echo "cordova plugin add cordova-plugin-scanbot-example-ui";
cordova plugin add cordova-plugin-scanbot-sdk;
cordova plugin add cordova-plugin-scanbot-example-ui;

echo "\n${ECHO_COLOR}• Let's nuke the iOS SDK Framework...\n${NC}"
echo "rm -rf plugins/cordova-plugin-scanbot-sdk/src/ios/Frameworks";
rm -rf plugins/cordova-plugin-scanbot-sdk/src/ios/Frameworks


if [ "$DOWNLOAD_IOS_SDK" = true ] ; then
	echo "\n${ECHO_COLOR}• Let's re-download the iOS Framework${NC}"
	echo "node download-ios-framework.js";
	node download-ios-framework.js;
else
	echo "\n${ECHO_COLOR}• Now let's restore our backed up iOS Framework\n${NC}"
	echo "cp -R .nuke_backup plugins/cordova-plugin-scanbot-sdk/src/ios/Frameworks";
	cp -R .nuke_backup plugins/cordova-plugin-scanbot-sdk/src/ios/Frameworks;

	echo "\n${ECHO_COLOR}• Finally we remove the SDK temporary backup aaaand....\n${NC}"
	echo "rm -rf .nuke_backup";
	rm -rf .nuke_backup;
fi


echo "\n${ECHO_COLOR}• ...we can add our platforms back\n${NC}"
echo "ionic cordova platform add ios@${IOS_VERSION}";
ionic cordova platform add ios@$IOS_VERSION;
echo "ionic cordova platform add ios@${ANDROID_VERSION}"
ionic cordova platform add android@$ANDROID_VERSION;

echo "\n${ECHO_COLOR}• Now we can restore our build gradle configuration\n${NC}"

echo "rm -f plugins/cordova-plugin-scanbot-sdk/src/android/build.gradle";
rm -f plugins/cordova-plugin-scanbot-sdk/src/android/build.gradle

echo "rm -f platforms/android/cordova-plugin-scanbot-sdk/ionic-build-extras-sb.gradle";
rm -f platforms/android/cordova-plugin-scanbot-sdk/ionic-build-extras-sb.gradle 

echo "cp .original_build_gradle plugins/cordova-plugin-scanbot-sdk/src/android/build.gradle";
cp .original_build_gradle plugins/cordova-plugin-scanbot-sdk/src/android/build.gradle

echo "cp .original_build_extras platforms/android/cordova-plugin-scanbot-sdk/ionic-build-extras-sb.gradle";
cp .original_build_extras platforms/android/cordova-plugin-scanbot-sdk/ionic-build-extras-sb.gradle

echo "rm -f .original_build_gradle";
rm -f .original_build_gradle
echo "rm -f .original_build_extras";
rm -f .original_build_extras

echo "\Preparing everything...\n${NC}"
echo "cordova prepare"
cordova prepare;

echo "\n${ECHO_COLOR}• Preparing Android...\n${NC}"
echo "ionic cordova prepare android";
ionic cordova prepare android;

echo "\n${ECHO_COLOR}• Preparing iOS...\n${NC}"
echo "ionic cordova prepare ios";
ionic cordova prepare ios;

echo "\n${ECHO_COLOR}• DONE! Now it's your turn\n${NC}";

