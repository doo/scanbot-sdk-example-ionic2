import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HomePage } from './home.page';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {RouteReuseStrategy} from '@angular/router';
import {IonicRouteStrategy} from '@ionic/angular';
import {DialogsService} from '../services/dialogs.service';
import {ScanbotSdkDemoService} from '../services/scanbot-sdk-demo.service';
import {ImageResultsRepository} from '../services/image-results.repository';

describe('IdCardScanResultsPage', () => {
    let component: HomePage;
    let fixture: ComponentFixture<HomePage>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ HomePage ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: [
                { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
                DialogsService,
                ScanbotSdkDemoService,
                ImageResultsRepository,
            ],
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(HomePage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
        console.log('IS HOME', component, expect(component).toBeTruthy());
    });
});
