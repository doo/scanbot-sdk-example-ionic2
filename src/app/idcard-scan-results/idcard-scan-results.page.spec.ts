import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IdCardScanResultsPage } from './idcard-scan-results.page';
import {RouteReuseStrategy} from '@angular/router';
import {IonicRouteStrategy} from '@ionic/angular';
import {DialogsService} from '../services/dialogs.service';
import {ScanbotSdkDemoService} from '../services/scanbot-sdk-demo.service';
import {ImageResultsRepository} from '../services/image-results.repository';
import {IonicStorageModule, Storage} from '@ionic/storage';

describe('IdCardScanResultsPage', () => {
  let component: IdCardScanResultsPage;
  let fixture: ComponentFixture<IdCardScanResultsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IdCardScanResultsPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      imports: [
        IonicStorageModule.forRoot()
      ],
      providers: [
        IonicStorageModule,
        Storage
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IdCardScanResultsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
