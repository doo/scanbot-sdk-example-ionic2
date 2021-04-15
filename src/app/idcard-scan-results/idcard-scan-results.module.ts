import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { IdCardScanResultsPage } from './idcard-scan-results.page';
import {IonicStorageModule} from '@ionic/storage';

const routes: Routes = [
  {
    path: '',
    component: IdCardScanResultsPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    IonicStorageModule.forRoot()
  ],
  declarations: [IdCardScanResultsPage]
})
export class IdCardScanResultsPageModule {}
