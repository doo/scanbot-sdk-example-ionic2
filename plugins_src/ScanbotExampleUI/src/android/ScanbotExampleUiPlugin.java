package io.scanbot.cordova.exampleui;

import android.app.Activity;
import android.content.Intent;

import com.opensooq.supernova.gligar.GligarPicker;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import io.scanbot.sdk.plugin.cordova.utils.JsonArgs;


public class ScanbotExampleUiPlugin extends CordovaPlugin {


    private CallbackContext callbackContext;
    private static final int MULTIPLE_IMAGE_PICKER_REQUEST_CODE = 999001;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {

        final JSONObject jsonArgs = (args.length() > 0 ? args.getJSONObject(0) : new JSONObject());
        this.callbackContext = callbackContext;

        if ("startMultipleImagePicker".equals(action)) {
            startMultipleImagePicker(jsonArgs, callbackContext);
            return true;
        }
        return false;
    }

    private void startMultipleImagePicker(JSONObject args, CallbackContext callbackContext) {
        this.cordova.setActivityResultCallback(ScanbotExampleUiPlugin.this);
        new GligarPicker()
                .requestCode(MULTIPLE_IMAGE_PICKER_REQUEST_CODE)
                .limit(30)
                .withActivity(cordova.getActivity())
                .show();
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent intent) {
        super.onActivityResult(requestCode, resultCode, intent);
        if (resultCode != Activity.RESULT_OK) {
            callbackContext.success(new JsonArgs().put("status", "CANCELED").jsonObj());
            return;
        }
        if (requestCode == MULTIPLE_IMAGE_PICKER_REQUEST_CODE) {
            String[] pathsList = intent.getExtras().getStringArray(GligarPicker.IMAGES_RESULT);

            JSONArray imageUris = new JSONArray();
            for(String path : pathsList) {
                imageUris.put(path);
            }

            JsonArgs outResult = new JsonArgs();
            outResult.put("status", "OK");
            outResult.put("imageFilesUris", imageUris);

            callbackContext.success(outResult.jsonObj());
        }
    }
}
