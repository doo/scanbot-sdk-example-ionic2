import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { BarcodeDocumentListPage } from './barcode-document-list.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: BarcodeDocumentListPage
      }
    ])
  ],
  declarations: [BarcodeDocumentListPage]
})

export class BarcodeDocumentListModule { }
