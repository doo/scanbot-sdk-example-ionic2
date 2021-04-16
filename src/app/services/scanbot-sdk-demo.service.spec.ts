import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {TestBed, ComponentFixture} from '@angular/core/testing';
import { HomePage } from '../home/home.page';
import { AppModule } from '../app.module'

import { ScanbotSdkDemoService } from './scanbot-sdk-demo.service';

describe('ScanbotSdkDemoService', () => {
    let component: ScanbotSdkDemoService 
    let fixture: ComponentFixture<ScanbotSdkDemoService>
    // let homePage: HomePage

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [ScanbotSdkDemoService],
            imports: [AppModule],
            providers: [HomePage],
            schemas: [CUSTOM_ELEMENTS_SCHEMA]
        });

        // create component and test fixture
        fixture = TestBed.createComponent(ScanbotSdkDemoService);

        // get test component from the fixture
        component = fixture.componentInstance;

        // UserService provided to the TestBed
        // homePage = TestBed.get(HomePage);
    });
    fit('is defined', () => {
        expect(component.checkLicense()).toBeDefined;
    });
});