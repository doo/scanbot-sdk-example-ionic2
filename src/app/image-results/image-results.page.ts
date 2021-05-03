import { Component } from '@angular/core';
import { ActionSheetController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';

import { Page } from 'cordova-plugin-scanbot-sdk';

import { DialogsService } from '../services/dialogs.service';
import { ScanbotSdkDemoService } from '../services/scanbot-sdk-demo.service';
import { ImageResultsRepository } from '../services/image-results.repository';

@Component({
    selector: 'app-image-results',
    templateUrl: 'image-results.page.html',
    styleUrls: ['image-results.page.scss'],
})
export class ImageResultsPage {

    public pages: Page[] = [];
    public rows = [];
    public sanitizedPreviewImages = new Map<string, string>();

    constructor(private scanbotService: ScanbotSdkDemoService,
                private imageResultsRepository: ImageResultsRepository,
                private dialogsService: DialogsService,
                private platform: Platform,
                private router: Router,
                private actionSheetController: ActionSheetController) { }

    ionViewWillEnter() {
        this.reloadPages();
    }

    private async reloadPages() {
        this.pages = this.imageResultsRepository.getPages();
        // build sanitizes preview image file URIs
        for (const page of this.pages) {
            // this.sanitizedPreviewImages.set(page.pageId,
            //     this.imageResultsRepository.sanitizeFileUri(page.documentPreviewImageFileUri));

            const data = await this.scanbotService.fetchDataFromUri(page.documentPreviewImageFileUri);
            this.sanitizedPreviewImages.set(page.pageId, this.imageResultsRepository.sanitizeBase64(data));
        }
        // build rows
        this.rows = [];
        for (let i = 0; i < this.pages.length; i += 3) {
            this.rows.push({ pages: this.pages.slice(i, i + 3) });
        }
    }

    async gotoImageView(page: Page) {
        await this.router.navigate(['/image-view', page.pageId]);
    }

    async saveAsPdf() {
        if (!(await this.scanbotService.checkLicense())) { return; }
        if (!this.checkImages()) { return; }

        const loading = await this.dialogsService.createLoading('Creating PDF ...');
        try {
            await loading.present();
            const result = await this.scanbotService.SDK.createPdf({
                images: this.pages.map(p => p.documentImageFileUri),
                pageSize: 'FIXED_A4'
            });

            await this.dialogsService.showAlert(result.pdfFileUri, 'PDF created');
        } catch (e) {
            console.error('Unable to create PDF.', e);
            await this.dialogsService.showAlert(e.message, 'ERROR');
        }
        finally {
            await loading.dismiss();
        }
    }

    async saveAsPdfWithOcr() {
        if (!(await this.scanbotService.checkLicense())) { return; }
        if (!this.checkImages()) { return; }

        const loading = await this.dialogsService.createLoading('Performing OCR and creating PDF ...');
        try {
            await loading.present();
            const result = await this.scanbotService.SDK.performOcr({
                images: this.pages.map(p => p.documentImageFileUri),
                languages: ['en'],
                outputFormat: 'FULL_OCR_RESULT',
            });

            await this.dialogsService.showAlert(result.pdfFileUri, 'PDF with OCR created');
        } catch (e) {
            console.error('Unable to perform OCR.', e);
            await this.dialogsService.showAlert(e.message, 'ERROR');
        }
        finally {
            await loading.dismiss();
        }
    }

    async saveAsBinarizedTiff() {
        if (!(await this.scanbotService.checkLicense())) { return; }
        if (!this.checkImages()) { return; }

        const loading = await this.dialogsService.createLoading('Creating TIFF ...');
        try {
            await loading.present();
            const result = await this.scanbotService.SDK.writeTiff({
                images: this.pages.map(p => p.documentImageFileUri),
                oneBitEncoded: true, // creates 1-bit binarized black and white TIFF
                dpi: 300, // default value is 200
                // compression: 'LZW' // recommended default value is 'CCITT_T6' (aka. "CCITT Fax 4")
            });

            await this.dialogsService.showAlert(result.tiffFileUri, 'TIFF file created');
        } catch (e) {
            console.error('Unable to create TIFF.', e);
            await this.dialogsService.showAlert(e.message, 'ERROR');
        }
        finally {
            await loading.dismiss();
        }
    }

    async showSaveSelection() {
        const actionSheet = await this.actionSheetController.create({
            header: 'Save Images as',
            buttons: [
                {
                    text: 'PDF',
                    icon: 'document',
                    handler: () => { this.saveAsPdf(); }
                },
                {
                    text: 'PDF with OCR',
                    icon: 'document',
                    handler: () => { this.saveAsPdfWithOcr(); }
                },
                {
                    text: 'TIFF (1-bit b&w)',
                    icon: 'document',
                    handler: () => { this.saveAsBinarizedTiff(); }
                },
                {
                    text: 'Cancel',
                    icon: 'close',
                    role: 'cancel',
                    handler: () => { }
                }
            ]
        });
        await actionSheet.present();
    }


    private checkImages(): boolean {
        if (this.pages.length > 0) {
            return true;
        }
        this.dialogsService.showAlert(
            'Please scan some images via Document Scanner or import from Photo Library.',
            'Images Required');
        return false;
    }

    async addScan() {
        if (!(await this.scanbotService.checkLicense())) { return; }

        const configs = this.scanbotService.globalDocScannerConfigs();
        // for demo purposes we want to add only one page here.
        configs.multiPageEnabled = false;
        configs.multiPageButtonHidden = true;

        const result = await this.scanbotService.SDK.UI.startDocumentScanner({uiConfigs: configs});

        if (result.status === 'CANCELED') { return; }

        await this.imageResultsRepository.addPages(result.pages);
        this.reloadPages();
    }

    async removeAll() {
        await this.scanbotService.SDK.cleanup();
        await this.imageResultsRepository.removeAllPages();
        this.reloadPages();
    }
}
