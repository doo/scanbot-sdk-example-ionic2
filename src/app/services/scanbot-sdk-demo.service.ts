import { Component, Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { File } from '@ionic-native/file/ngx';

import ScanbotSdk, {
    CameraImageFormat,
    DocumentScannerConfiguration,
    FileEncryptionMode,
    ScanbotSDKConfiguration
} from 'cordova-plugin-scanbot-sdk';

import { environment } from '../../environments/environment';
import { DialogsService } from './dialogs.service';

@Component({
    selector: 'app-root',
    templateUrl: '../app.component.html'
  })

@Injectable()
export class ScanbotSdkDemoService {

    /*
     * TODO add the license key here.
     * Please note: The Scanbot SDK will run without a license key for one minute per session!
     * After the trial period is over all Scanbot SDK functions as well as the UI components will stop working
     * or may be terminated. You can get an unrestricted "no-strings-attached" 30 day trial license key for free.
     * Please submit the trial license form (https://scanbot.io/sdk/trial.html) on our website by using
     * the app identifier "io.scanbot.example.sdk.cordova.ionic" of this example app
     * or of your app (see config.xml <widget id="your.app.id" ...>).
     */
    static readonly SDK_LICENSE_KEY: string = '';

    /* Optional image format & quality parameters */
    static readonly IMAGE_FILE_FORMAT: CameraImageFormat = 'JPG';
    static readonly JPG_IMAGE_QUALITY = 80;

    public static readonly ENCRYPTION_ENABLED: boolean = false;
    /* Optional file encryption parameters */
    static readonly FILE_ENCRYPTION_PASSWORD: string = 'SomeSecretPa$$w0rdForFileEncryption';
    static readonly FILE_ENCRYPTION_MODE: FileEncryptionMode = 'AES256';

    public SDK = ScanbotSdk.promisify();

    private readonly sdkReady: Promise<any>;

    constructor(private platform: Platform,
                private dialogsService: DialogsService,
                private file: File) {
        this.sdkReady = new Promise<any>((resolve, reject) => {
            this.platform.ready().then(() => {
                this.initScanbotSdk()
                    .then(result => resolve(result))
                    .catch(err => reject(err));
            });
        });
    }

    public ready() {
        return this.sdkReady;
    }

    private initScanbotSdk() {
        const config: ScanbotSDKConfiguration = {
            loggingEnabled: !environment.production, // Disable logging in production builds for security and performance reasons!
            licenseKey: ScanbotSdkDemoService.SDK_LICENSE_KEY,
            storageImageFormat: ScanbotSdkDemoService.IMAGE_FILE_FORMAT,
            storageImageQuality: ScanbotSdkDemoService.JPG_IMAGE_QUALITY,
            storageBaseDirectory: this.getDemoStorageBaseDirectory(), // optional storageBaseDirectory, see comments below
            documentDetectorMode: 'ML_BASED'
        };

        if (ScanbotSdkDemoService.ENCRYPTION_ENABLED) {
            config.fileEncryptionPassword = ScanbotSdkDemoService.FILE_ENCRYPTION_PASSWORD;
            config.fileEncryptionMode = ScanbotSdkDemoService.FILE_ENCRYPTION_MODE;
        }

        return this.SDK.initializeSdk(config).then(result => {
            console.log(JSON.stringify(result));
        }).catch(err => {
            console.error(JSON.stringify(err));
        });
    }

    private getDemoStorageBaseDirectory(): string {
        // tslint:disable:max-line-length
        // !! Please note !!
        // It is strongly recommended to use the default (secure) storage location of the Scanbot SDK.
        // However, for demo purposes we overwrite the "storageBaseDirectory" of the Scanbot SDK by a custom storage directory.
        //
        // On Android we use the "externalDataDirectory" which is a public(!) folder.
        // All image files and export files (PDF, TIFF, etc) created by the Scanbot SDK in this demo app will be stored
        // in this public storage directory and will be accessible for every(!) app having external storage permissions!
        // Again, this is only for demo purposes, which allows us to easily fetch and check the generated files
        // via Android "adb" CLI tools, Android File Transfer app, Android Studio, etc.
        //
        // On iOS we use the "documentsDirectory" which is accessible via iTunes file sharing.
        //
        // For more details about the storage system of the Scanbot SDK Plugin please see our docs:
        // - https://scanbotsdk.github.io/documentation/cordova/
        //
        // For more details about the file system on Android and iOS we also recommend to check out:
        // - https://developer.android.com/guide/topics/data/data-storage
        // - https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html
        // tslint:enable:max-line-length

        if (this.platform.is('android')) {
            return this.file.externalDataDirectory + 'my-custom-storage';
        } else if (this.platform.is('ios')) {
            return this.file.documentsDirectory + 'my-custom-storage';
        }
        return null;
    }

    public async checkLicense() {
        const result = await this.SDK.getLicenseInfo();
        if (result.info.isLicenseValid) {
            // OK - we have a trial session, a valid trial license or valid production license.
            return true;
        }
        await this.dialogsService.showAlert('Scanbot SDK (trial) license has expired!');
        return false;
    }

    public globalDocScannerConfigs(): DocumentScannerConfiguration {
        return {
            // Customize colors, text resources, behavior, etc..
            cameraPreviewMode: 'FIT_IN',
            orientationLockMode: 'PORTRAIT',
            pageCounterButtonTitle: '%d Page(s)',
            multiPageEnabled: true,
            ignoreBadAspectRatio: true,
            topBarBackgroundColor: '#c8193c',
            bottomBarBackgroundColor: '#c8193c',
            // maxNumberOfPages: 3,
            // documentImageSizeLimit: { width: 2000, height: 3000 },
            // see further configs ...
        };
    }

    public async fetchDataFromUri(path: string): Promise<string> {
        const result = await this.SDK.getImageData({imageFileUri: path});
        const extension = ScanbotSdkDemoService.IMAGE_FILE_FORMAT === 'JPG' ? 'jpeg' : 'png';
        // ScanbotSDK return the raw base64 data. Add prefix to convert it to a dataUri
        return `data:image/${extension};base64,` + result.base64ImageData;
    }
}
