import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import ScanbotExampleUI from 'cordova-plugin-scanbot-example-ui';

@Injectable()
export class ScanbotExampleUIService {
    public Plugin = ScanbotExampleUI.promisify();
}
