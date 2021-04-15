import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HomePage } from './home.page';
import {RouteReuseStrategy} from '@angular/router';
import {IonicRouteStrategy} from '@ionic/angular';
import {DialogsService} from '../services/dialogs.service';
import {ScanbotSdkDemoService} from '../services/scanbot-sdk-demo.service';
import {ImageResultsRepository} from '../services/image-results.repository';
import {AppRoutingModule} from '../app-routing.module';
import {IonicStorageModule} from '@ionic/storage';

describe('HomePage', () => {
    let component: HomePage;
    let fixture: ComponentFixture<HomePage>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ HomePage ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            imports: [
                AppRoutingModule,
                IonicStorageModule.forRoot()
            ],
            providers: [
                { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
                DialogsService,
                ScanbotSdkDemoService,
                ImageResultsRepository
            ]
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
