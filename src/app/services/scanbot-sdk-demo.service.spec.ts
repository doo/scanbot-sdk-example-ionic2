import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {TestBed, ComponentFixture} from '@angular/core/testing';
import { HomePage } from '../home/home.page';
import { AppModule } from '../app.module';

import { ScanbotSdkDemoService } from './scanbot-sdk-demo.service';
import {APP_BASE_HREF} from '@angular/common';
import ScanbotSdk, {ScanbotSDKConfiguration} from 'cordova-plugin-scanbot-sdk';

describe('ScanbotSdkDemoService', () => {
    let component: ScanbotSdkDemoService;
    let fixture: ComponentFixture<ScanbotSdkDemoService>;
    let SDK = ScanbotSdk.promisify();

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [ScanbotSdkDemoService],
            imports: [AppModule],
            providers: [
                HomePage,
                { provide: APP_BASE_HREF, useValue: '/'},
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA]
        });

        // create component and test fixture
        fixture = TestBed.createComponent(ScanbotSdkDemoService);

        // get test component from the fixture
        component = fixture.componentInstance;

        // UserService provided to the TestBed
        // homePage = TestBed.get(HomePage);
    });
    fit('initialize!', async () => {
        const config: ScanbotSDKConfiguration = {
            licenseKey: ''
        };
        await SDK.initializeSdk(config);
        expect(component.checkLicense()).toBeDefined();
    });
});
