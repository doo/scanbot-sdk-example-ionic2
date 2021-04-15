import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { IdCardScanResultsPage } from './idcard-scan-results.page';
import {IonicStorageModule} from '@ionic/storage';

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
