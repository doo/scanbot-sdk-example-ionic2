import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { Html5CameraPage } from './html5-camera.page';
import {RouteReuseStrategy} from '@angular/router';
import {IonicRouteStrategy} from '@ionic/angular';
import {Storage} from '@ionic/storage';
import {ImageResultsRepository} from '../services/image-results.repository';
import {ScanbotSdkDemoService} from '../services/scanbot-sdk-demo.service';
import {DialogsService} from '../services/dialogs.service';

describe('Html5CameraPage', () => {
  let component: Html5CameraPage;
  let fixture: ComponentFixture<Html5CameraPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ Html5CameraPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        ScanbotSdkDemoService,
        DialogsService
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(Html5CameraPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
