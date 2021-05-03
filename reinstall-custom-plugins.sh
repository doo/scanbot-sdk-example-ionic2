
# .---------------------.
# |  REINSTALL PLUGINS  |
# .---------------------.

CUSTOM_PLUGINS=(
	cordova-plugin-scanbot-example-ui
)

# Backup package.json
cp package.json .package-json.bak;

# Remove Custom plugins
for plugin in ${CUSTOM_PLUGINS[@]}; do
	cordova plugin remove $plugin;
done;

# Restore original package.json
rm package.json;
mv .package-json.bak package.json;

# Add removed plugins back
for plugin in ${CUSTOM_PLUGINS[@]}; do
	cordova plugin add $plugin;
done;

# Refresh node modules
rm package-lock.json;
npm install;

# .---------------------.
# | REINSTALL PLATFORMS |
# .---------------------.

IOS_VERSION=`ionic cordova platform ls | egrep -io 'ios.*$' | sed -e 's/ios //g' | sed -e 's/\s*//g'`;
ANDROID_VERSION=`ionic cordova platform ls | egrep -io 'android.*$' | sed -e 's/android //g' | sed -e 's/\s*//g'`;

# Backup build.gradle
cp plugins/cordova-plugin-scanbot-sdk/src/android/build.gradle .original_build_gradle
cp platforms/android/cordova-plugin-scanbot-sdk/ionic-build-extras-sb.gradle .original_build_extras

# Reinstall Android platform
ionic cordova platform remove android;
ionic cordova platform add android@$ANDROID_VERSION;

# Restore build.gradle
rm -f plugins/cordova-plugin-scanbot-sdk/src/android/build.gradle
rm -f platforms/android/cordova-plugin-scanbot-sdk/ionic-build-extras-sb.gradle 

cp .original_build_gradle plugins/cordova-plugin-scanbot-sdk/src/android/build.gradle
cp .original_build_extras platforms/android/cordova-plugin-scanbot-sdk/ionic-build-extras-sb.gradle 

# Remove backup gradle file
rm -f .original_build_gradle
rm -f .original_build_extras

# Prepare
cordova prepare;
ionic cordova prepare android;

# Victory
echo "Done!";

