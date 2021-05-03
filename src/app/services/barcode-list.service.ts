import { Injectable } from '@angular/core';

export interface BarcodesDetectionViewModel {
    snappedImage?: string,
    barcodes: {
        text: string,
        type: string
    }[]
}

@Injectable({
    providedIn: 'root',
})
export class BarcodeListService {

    public static detectedBarcodes: BarcodesDetectionViewModel[] = [];

    public static items = [
        { key: 'AZTEC',        value: true },
        { key: 'CODABAR',      value: true },
        { key: 'CODE_39',      value: true },
        { key: 'CODE_93',      value: true },
        { key: 'CODE_128',     value: true },
        { key: 'DATA_MATRIX',  value: true },
        { key: 'EAN_8',        value: true },
        { key: 'EAN_13',       value: true },
        { key: 'ITF',          value: true },
        { key: 'PDF_417',      value: true },
        { key: 'QR_CODE',      value: true },
        { key: 'RSS_14',       value: true },
        { key: 'RSS_EXPANDED', value: true },
        { key: 'UPC_A',        value: true },
        { key: 'UPC_E',        value: true }
    ];

    public static update(format, isChecked) {
        for (let i = 0; i < BarcodeListService.items.length; i++) {
            if (BarcodeListService.items[i].key === format) {
                BarcodeListService.items[i].value = isChecked;
            }
        }
    }

    public static getAcceptedTypes() {
        const result = [];

        for (let i = 0; i < BarcodeListService.items.length; i++) {
            if (BarcodeListService.items[i].value) {
                result.push(BarcodeListService.items[i].key);
            }
        }

        return result;
    }
}
