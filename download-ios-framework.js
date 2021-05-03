
const request = require('request');
const fs = require('fs');
const AdmZip = require('adm-zip');
const path = require('path');

const version = "1.15.1";
const url = `https://download.scanbot.io/sdk/ios/scanbot-ios-sdk${version}.zip`;
const zipFile = "sdk-ios.zip";

try {
	const file = fs.createWriteStream(zipFile);
	file.on("error", (e) => {
		warnWithMessage(e.message);
	});
	console.log("Downloading Scanbot SDK ... (" + url + ")");
	const response = request.get(url).on("error", (e) => {
		warnWithMessage(e.message);
	});
	response.pipe(file);
	file.on("finish", function() {
		console.log("Unzipping and moving Scanbot SDK Framework");
		try {
			const zip = new AdmZip(zipFile);
			const zipFolder = "ScanbotSDK";
			const destFolder = "Frameworks"
			const sdkPath = path.join("plugins", "cordova-plugin-scanbot-sdk", "src", "ios");
			zip.extractAllTo(sdkPath, true);

			fs.rename(path.join(sdkPath, zipFolder), path.join(sdkPath, destFolder), function() {
				console.log("Done!");
			});
		} catch (e) {
			warnWithMessage(e.message);
		}
	});
} catch (e) {
	warnWithMessage(e.message);
}

function warnWithMessage(message) {
	console.warn("Failed to download and extract ScanbotSDK iOS:");
	console.warn("Reason:", message);
	console.warn("cordova-plugin-scanbot-sdk will not compile on iOS!");
	console.warn("Please contact ScanbotSDK Support with the error message");
}
