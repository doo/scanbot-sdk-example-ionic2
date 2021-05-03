
///// Base Cordova API

export type ScanbotExampleUI_SuccessCallback<TResult> = (result: TResult) => void;
export type ScanbotExampleUI_ErrorCallback = (error: {
    status: "ERROR";
    message: string;
}) => void;

export type ScanbotExampleUI_Status = "OK" | "CANCELED";

export interface ScanbotExampleUI_GenericResult {
    status: ScanbotExampleUI_Status;
    message?: string;
}

export interface ScanbotExampleUI_MultipleImagePickerResult {
    imageFilesUris: string[]
}

export interface ScanbotExampleUIBridge {
    startMultipleImagePicker(args: {}): Promise<ScanbotExampleUI_GenericResult & ScanbotExampleUI_MultipleImagePickerResult> ; // & imageFileUris
}

export interface ScanbotExampleUICordova {
    /**
     * Returns a promisified version of the Scanbot SDK API.
     * Available only if there is also an available Promise global function.
     */
    promisify?(): ScanbotExampleUIBridge;
    
    startMultipleImagePicker(success: ScanbotExampleUI_SuccessCallback<ScanbotExampleUI_GenericResult>,
                             error: ScanbotExampleUI_ErrorCallback,
                             args: {}): void;
}

declare let ScanbotExampleUI: ScanbotExampleUICordova;

export default ScanbotExampleUI;
