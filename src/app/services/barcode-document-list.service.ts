import { Injectable } from '@angular/core';
import { BarcodeDocumentFormat } from 'cordova-plugin-scanbot-sdk';

@Injectable({
    providedIn: 'root',
})
export class BarcodeDocumentListService {

    public static isFilteringEnabled = false;

    public static list = [
      {key: 'AAMVA', value: true},
      {key: 'BOARDING_PASS', value: true},
      {key: 'DE_MEDICAL_PLAN', value: true},
      {key: 'DISABILITY_CERTIFICATE', value: true},
      {key: 'ID_CARD_PDF_417', value: true},
      {key: 'SEPA', value: true},
      {key: 'SWISS_QR', value: true},
      {key: 'VCARD', value: true},
    ];

    public static getAcceptedFormats(): BarcodeDocumentFormat[] {
        if (!BarcodeDocumentListService.isFilteringEnabled) {
          return [];
        }
        
        let result: BarcodeDocumentFormat[] = [];
        BarcodeDocumentListService.list.forEach((format) => {
          if (format.value) {
            result.push(<BarcodeDocumentFormat>format.key);
          }
        });
        return result;
      }
      public static update(updated: any) {
        BarcodeDocumentListService.list.forEach((original) => {
          if (original.key === updated.key) {
            original.value = updated.value;
          }
        });
      }
}
