import { Component, NgZone } from '@angular/core';
import { BarcodeDocumentListService } from '../services/barcode-document-list.service';

@Component({
    selector: 'app-barcode-document-list',
    templateUrl: 'barcode-document-list.page.html',
})
export class BarcodeDocumentListPage {

    documentTypes = [];
    isFilteringEnabled: boolean;

    constructor(private ngZone: NgZone) {
        this.documentTypes = BarcodeDocumentListService.list;
        this.isFilteringEnabled = BarcodeDocumentListService.isFilteringEnabled;
    }

    onChange($event: CustomEvent) {
        const key = $event.detail.value;
        const value = $event.detail.checked;
        BarcodeDocumentListService.update({
            key: key,
            value: value
        });
    }

    onEnabledChange($event: CustomEvent) {
        const value = $event.detail.checked;
        BarcodeDocumentListService.isFilteringEnabled = value;
        this.ngZone.run(() => {
            this.isFilteringEnabled = BarcodeDocumentListService.isFilteringEnabled;
        });
    }
}
