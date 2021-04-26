import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { Camera as ImagePicker } from '@ionic-native/camera/ngx';

import ScanbotSdk, {
  DataScannerConfiguration,
  HealthInsuranceCardScannerConfiguration,
  LicensePlateDetectorMode,
  LicensePlateScannerConfiguration,
  MrzScannerConfiguration,
  TextDataScannerStep,
  IdCardScannerConfiguration
} from 'cordova-plugin-scanbot-sdk';

import { DialogsService } from '../services/dialogs.service';
import { ScanbotSdkDemoService } from '../services/scanbot-sdk-demo.service';
import { ImageResultsRepository } from '../services/image-results.repository';
import { BarcodeListService } from '../services/barcode-list.service';
import { IdCardScanResultsService } from '../services/idcard-scan-results.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  public static Uint8ToStringViaReader(u8a) {
    // @ts-ignore
    return new Promise(resolve => {
      const r = new FileReader();
      r.onload = ev => { resolve(r.result); };
      r.readAsBinaryString(new Blob([u8a], { type: "binary/octet-stream" }));
    });
  }

  constructor(private scanbotService: ScanbotSdkDemoService,
              private imageResultsRepository: ImageResultsRepository,
              private dialogsService: DialogsService,
              private platform: Platform,
              private router: Router,
              private imagePicker: ImagePicker) {

    document.addEventListener('deviceready', async function() {
      /*
       * Register a vanilla javascript callback, as setLicenseFailure registers a continuous callback
       * that does not adhere to the standards of promisified API.
       * All other Scanbot features are also a part of the normal, non-promisified API
       *
       * Note that, as is, license failure handler is never called, because in this example
       * we always check license validity before calling any Scanbot API.
       */
      ScanbotSdk.setLicenseFailureHandler(async callback => {
        const status = callback.licenseStatus;
        const feature = callback.licenseFeature;
        console.log('Feature ' + feature + ' is not available because license is ' + status);
      });


      const promised = ScanbotSdk.promisify();
      const raw_repository = "https://raw.githubusercontent.com/doo/scanbot-sdk-android-integration-tests/";
      const ratio_image = "a59bb0180755d73b1d9f0981aaeb9e23ee6a87ba/assets/docdetector/aspect_ratio.jpg";
      const token = "?token=ACCIOL2BBBG4MVEK5STZZ6LARQPJU";

      //@ts-ignore
      const saveResult = await promised.Test.saveFile({url: raw_repository + ratio_image + token});
      console.log("save result", saveResult);

      await scanbotService.ready();

      const createResult = await promised.createPage({originalImageFileUri: saveResult.path});
      console.log("create result", createResult);
      const detectionResult = await promised.detectDocumentOnPage({page: createResult.page});
      console.log("detection result", detectionResult);
    });
  }

  async startDocumentScanner() {
    if (!(await this.scanbotService.checkLicense())) { return; }

    const configs = this.scanbotService.globalDocScannerConfigs();
    const result = await this.scanbotService.SDK.UI.startDocumentScanner({uiConfigs: configs});

    if (result.status === 'CANCELED') {
      // user has canceled the scanning operation
      return;
    }

    await this.imageResultsRepository.addPages(result.pages);
    await this.gotoImageResults();
  }

  async pickImageFromPhotoLibrary() {
    // Import an image from Photo Library and run auto document detection on it.

    const picture = await this.imagePicker.getPicture({
        sourceType: this.imagePicker.PictureSourceType.PHOTOLIBRARY,
        mediaType: this.imagePicker.MediaType.PICTURE,
        destinationType: this.imagePicker.DestinationType.FILE_URI,
        quality: 80,
        encodingType: this.imagePicker.EncodingType.JPEG,
        allowEdit: false,
    });
    const originalImageFileUri = picture as string;

    if (!(await this.scanbotService.checkLicense())) { return; }

    const loading = await this.dialogsService.createLoading('Auto-detecting and cropping...');
    try {
      await loading.present();

      // First create a new SDK page with the selected original image file:
      const createResult = await this.scanbotService.SDK.createPage({originalImageFileUri});
      // and then run auto document detection and cropping on this new page:
      const docResult = await this.scanbotService.SDK.detectDocumentOnPage({page: createResult.page});

      await this.imageResultsRepository.addPages([docResult.page]);
      await this.gotoImageResults();
    } catch (e) {
      console.error('Unable to process selected image.', e);
      await this.dialogsService.showAlert(e.message, 'ERROR', 'Unable to process selected image.');
    }
    finally {
      await loading.dismiss();
    }
  }

  async gotoImageResults() {
    await this.router.navigateByUrl('/image-results');
  }

  async startBarcodeScanner() {
    if (!(await this.scanbotService.checkLicense())) { return; }

    const result = await this.scanbotService.SDK.UI.startBarcodeScanner({
      uiConfigs: {
        // Customize colors, text resources, behavior, etc..
        finderTextHint: 'Please align the barcode or QR code in the frame above to scan it.',
        barcodeFormats: BarcodeListService.getAcceptedTypes(),
        barcodeImageGenerationType: 'VIDEO_FRAME',
        orientationLockMode: 'PORTRAIT',
        finderLineColor: '#0000ff',
        finderAspectRatio: { width: 2, height: 1 },
        topBarBackgroundColor: '#c8193c',
        useButtonsAllCaps: false,
        // see further configs ...
      }
    });

    if (result.status === 'OK') {
      BarcodeListService.detectedBarcodes = result.barcodes;
      BarcodeListService.snappedImage = result.imageFileUri;
      await this.router.navigateByUrl('/barcode-result-list');
    }
  }

  async startBatchBarcodeScanner() {
    if (!(await this.scanbotService.checkLicense())) { return; }

    const result = await this.scanbotService.SDK.UI.startBatchBarcodeScanner({
      uiConfigs: {
        // Customize colors, text resources, behavior, etc..
        finderTextHint: 'Please align the barcode or QR code in the frame above to scan it.',
        barcodeFormats: BarcodeListService.getAcceptedTypes(),
        finderAspectRatio: { width: 1, height: 1 },
        orientationLockMode: 'PORTRAIT',
        useButtonsAllCaps: false,
        // see further configs ...
      }
    });

    if (result.status === 'OK') {
      BarcodeListService.detectedBarcodes = result.barcodes;
      await this.router.navigateByUrl('/barcode-result-list');
    }
  }

  async startIdCardScanner() {
    if (!(await this.scanbotService.checkLicense())) { return; }

    const config: IdCardScannerConfiguration = {
      shouldSavePhotoImageInStorage: true
    };
    const result = await this.scanbotService.SDK.UI.startIdCardScanner({uiConfigs: config});

    if (result.status === 'OK') {
      IdCardScanResultsService.fields = result.fields;
      await this.router.navigateByUrl('/idcard-scan-results');
    }
  }

  async startMrzScanner() {

    if (!(await this.scanbotService.checkLicense())) { return; }

    const config: MrzScannerConfiguration = {
      // Customize colors, text resources, etc..
      finderTextHint: 'Please hold your phone over the 2- or 3-line MRZ code at the front of your passport.',
      orientationLockMode: 'PORTRAIT',
      // see further configs ...
    };

    if (this.platform.is('ios')) {
      const widthPx = window.screen.width;
      config.finderWidth = widthPx * 0.9;
      config.finderHeight = widthPx * 0.18;
    }

    const result = await this.scanbotService.SDK.UI.startMrzScanner({uiConfigs: config});
    if (result.status === 'OK') {
      const fields = result.mrzResult.fields.map(f => `<div>${f.name}: ${f.value} (${f.confidence.toFixed(2)})</div>`);
      await this.dialogsService.showAlert(fields.join(''), 'MRZ Result');
    }
  }

  async startEHICScanner() {

    if (!(await this.scanbotService.checkLicense())) {
      return;
    }

    const config: HealthInsuranceCardScannerConfiguration = {
      finderTextHint: 'Please hold your phone over the back of your Health Insurance Card.',
      orientationLockMode: 'PORTRAIT',
      // see further configs ...
    };
    const result = await this.scanbotService.SDK.UI.startEHICScanner({uiConfigs: config});
    if (result.status === 'OK') {
      const fields = result.ehicResult.fields.map(f => `<div>${f.type}: ${f.value} (${f.confidence.toFixed(2)})</div>`);
      await this.dialogsService.showAlert(fields.join(''), 'EHIC Result');
    }
  }
    async setAcceptedFormats() {
    await this.router.navigateByUrl('/barcode-list');
  }

  async viewLicenseInfo() {
    const result = await this.scanbotService.SDK.getLicenseInfo();
    await this.dialogsService.showAlert(JSON.stringify(result.info), 'License Info');
  }

  async viewOcrConfigs() {
    const result = await this.scanbotService.SDK.getOcrConfigs();
    await this.dialogsService.showAlert(JSON.stringify(result), 'OCR Configs');
  }

  async openHTMLCameraPage() {
    if (this.platform.is('ios')) {
      await this.dialogsService.showAlert('HTML5 Camera is an Android-only feature');
      return;
    }

    await this.router.navigateByUrl('/html5-camera');
  }

  async importAndDetectBarcodes() {
    const picture = await this.imagePicker.getPicture({
      sourceType: this.imagePicker.PictureSourceType.PHOTOLIBRARY,
      mediaType: this.imagePicker.MediaType.PICTURE,
      destinationType: this.imagePicker.DestinationType.FILE_URI,
      quality: 80,
      encodingType: this.imagePicker.EncodingType.JPEG,
      allowEdit: false,
    });

    const imageUri = picture as string;

    if (!(await this.scanbotService.checkLicense())) { return; }

    const loading = await this.dialogsService.createLoading('Detecting barcodes...');
    await loading.present();
    const result = await this.scanbotService.SDK.detectBarcodesOnImage(
        { imageFileUri: imageUri, barcodeFormats: BarcodeListService.getAcceptedTypes() }
        );
    BarcodeListService.detectedBarcodes = result.barcodes;
    BarcodeListService.snappedImage = imageUri;
    await loading.dismiss();
    await this.router.navigateByUrl('/barcode-result-list');
  }

  hasHtml5CameraSupport() {
    return this.platform.is('android');
  }

  async startLicensePlateScanner(mode: LicensePlateDetectorMode) {
    if (!(await this.scanbotService.checkLicense())) { return; }

    const config: LicensePlateScannerConfiguration = {
      detectorMode: mode,
      topBarBackgroundColor: '#c8193c',
      topBarButtonsColor: '#ffffff',
      cancelButtonTitle: 'Cancel',
      finderLineColor: '#c8193c',
      finderLineWidth: 5,
      guidanceText: 'Place the whole license plate in the frame to scan it',
      orientationLockMode: 'PORTRAIT',
      // see further configs...
    };

    const result = await this.scanbotService.SDK.UI.startLicensePlateScanner({uiConfigs: config});

    if (result.status === 'OK') {
      await this.dialogsService.showAlert(
          `Country: ${result.licensePlateResult.countryCode}<br>` +
          `License Plate: ${result.licensePlateResult.licensePlate}<br><br>` +
          `OCR Value: ${result.licensePlateResult.ocrValue}`,
          'License Plate Result');
    }
  }

  async startLcDisplayScanner() {
    if (!(await this.scanbotService.checkLicense())) { return; }

    const uiConfigs: DataScannerConfiguration = {
      cancelButtonTitle: 'Cancel',
      topBarBackgroundColor: '#c8193c',
      topBarButtonsColor: '#ffffff',
      finderLineColor: '#c8193c',
      orientationLockMode: 'PORTRAIT',
      // see further configs...
    };

    const scannerStep: TextDataScannerStep = {
      guidanceText: 'Place the LC display in the frame to scan it',
      textFilterStrategy: 'LC_DOT_MATRIX_DISPLAY',
    };

    const result = await this.scanbotService.SDK.UI.startDataScanner({uiConfigs, scannerStep});
    if (result.status === 'OK') {
      await this.dialogsService.showAlert(`Value: ${result.dataResult.textValue}`, 'Scanner Result');
    }
  }

}
