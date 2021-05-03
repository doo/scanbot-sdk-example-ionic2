import { Component, OnInit } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { ImageFilter, Page } from 'cordova-plugin-scanbot-sdk';

import { DialogsService } from '../services/dialogs.service';
import { ScanbotSdkDemoService } from '../services/scanbot-sdk-demo.service';
import { ImageResultsRepository } from '../services/image-results.repository';

@Component({
    selector: 'app-image-view',
    templateUrl: 'image-view.page.html',
})
export class ImageViewPage implements OnInit {

    public page: Page;
    public sanitizedPreviewImage: string;

    private imageFilterList: ImageFilter[] = [
        'NONE',
        'COLOR_ENHANCED',
        'GRAYSCALE',
        'BINARIZED',
        'COLOR_DOCUMENT',
        'PURE_BINARIZED',
        'BACKGROUND_CLEAN',
        'BLACK_AND_WHITE',
        'OTSU_BINARIZATION',
        'DEEP_BINARIZATION',
        'EDGE_HIGHLIGHT',
        'LOW_LIGHT_BINARIZATION',
        'LOW_LIGHT_BINARIZATION_2',
        'SENSITIVE_BINARIZATION'
    ];

    constructor(private scanbotService: ScanbotSdkDemoService,
                private imageResultsRepository: ImageResultsRepository,
                private dialogsService: DialogsService,
                private router: Router,
                private route: ActivatedRoute,
                private actionSheetController: ActionSheetController) { }

    ngOnInit() {
        this.route.paramMap.pipe(
            switchMap((params: ParamMap) => of(params.get('pageId')))
        ).subscribe(pageId => {
            this.page = this.imageResultsRepository.getPageById(pageId);
            this.sanitizePreviewImage();
        });
    }

    private async sanitizePreviewImage() {
        const data = await this.scanbotService.fetchDataFromUri(this.page.documentPreviewImageFileUri);
        this.sanitizedPreviewImage = this.imageResultsRepository.sanitizeBase64(data);
    }

    async startCroppingScreen() {
        if (!(await this.scanbotService.checkLicense())) { return; }

        const result = await this.scanbotService.SDK.UI.startCroppingScreen({
            page: this.page,
            uiConfigs: {
                // Customize colors, text resources, behavior, etc..
                doneButtonTitle: 'Save',
                orientationLockMode: 'PORTRAIT',
                topBarBackgroundColor: '#c8193c',
                bottomBarBackgroundColor: '#c8193c',
                hintTitle: 'Custom hint:\nDrag the dots to the document edges.',
                hintTitleColor: '#0000ff'
                // ...
            }
        });

        if (result.status === 'CANCELED') { return; }

        await this.updatePage(result.page);
    }

    async deletePage() {
        await this.scanbotService.SDK.removePage({page: this.page});
        await this.imageResultsRepository.removePage(this.page);
        await this.router.navigate(['/image-results']);
    }

    private async updatePage(page: Page) {
        await this.imageResultsRepository.updatePage(page);
        this.page = page;
        this.sanitizePreviewImage();
    }

    async showFilterSelection() {
        const buttons = [];
        this.imageFilterList.forEach(f => {
            buttons.push({
                text: f,
                handler: () => { this.applyImageFilter(f); }
            });
        });

        buttons.push({
            text: 'Cancel',
            role: 'cancel',
            handler: () => { }
        });

        const actionSheet = await this.actionSheetController.create({
            header: 'Select an Image Filter',
            buttons: buttons,
            cssClass: "image-filters-action-sheet"
        });
        await actionSheet.present();
    }

    private async applyImageFilter(filter: ImageFilter) {
        if (!(await this.scanbotService.checkLicense())) { return; }

        const loading = await this.dialogsService.createLoading('Applying image filter ...');
        try {
            await loading.present();
            const result = await this.scanbotService.SDK.applyImageFilterOnPage({page: this.page, imageFilter: filter});
            await this.updatePage(result.page);
        }
        finally {
            await loading.dismiss();
        }
    }

    async estimateBlurriness() {
        if (!(await this.scanbotService.checkLicense())) { return; }

        const loading = await this.dialogsService.createLoading('Estimating blurriness ...');
        try {
            await loading.present();
            /**
             * Estimates image blurriness. Less is sharper, more is blurred.
             *
             * In board terms, consider blur values as follows:
             * • 0.0-0.3: This image isn't blurry at all
             * • 0.3-0.6: Somewhat blurry, should be ok
             * • 0.6-1.0: I'm skeptical of the usefulness of the image
             *
             * However, this isn't that black and white. If a scanned document has a lot white background,
             * that will be considered a very blurred image.
             */
            const blurResult = await this.scanbotService.SDK.estimateBlur({imageFileUri: this.page.documentImageFileUri});
            await this.dialogsService.showAlert('Estimated blurriness on image: ' + blurResult.blur);
        }
        finally {
            await loading.dismiss();
        }
    }
}
