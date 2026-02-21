package com.vivemus.mobile;

import android.app.Activity;
import android.app.PictureInPictureParams;
import android.os.Build;
import android.util.Rational;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * Modulo nativo que expoe controle de Picture-in-Picture para o React Native.
 *
 * Uso no JS:
 *   import { NativeModules } from 'react-native';
 *   const { PipModule } = NativeModules;
 *   PipModule.setTeleconsultaAtiva(true);  // Habilita auto-PiP ao minimizar
 *   PipModule.enterPipMode();               // Entra manualmente em PiP
 */
public class PipModule extends ReactContextBaseJavaModule {

    public PipModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return "PipModule";
    }

    /**
     * Define se a teleconsulta esta ativa.
     * Quando true, o app entra automaticamente em PiP ao pressionar Home.
     */
    @ReactMethod
    public void setTeleconsultaAtiva(boolean ativa) {
        MainActivity.teleconsultaAtiva = ativa;

        // Configura auto-enter PiP no Android 12+ enquanto teleconsulta ativa
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Activity activity = getCurrentActivity();
            if (activity != null) {
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                builder.setAspectRatio(new Rational(16, 9));
                builder.setAutoEnterEnabled(ativa);
                builder.setSeamlessResizeEnabled(true);
                activity.setPictureInPictureParams(builder.build());
            }
        }
    }

    /**
     * Entra manualmente no modo PiP (para botoes na UI, por exemplo).
     */
    @ReactMethod
    public void enterPipMode(Promise promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.reject("PIP_NOT_SUPPORTED", "PiP requer Android 8.0+");
            return;
        }

        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity nao disponivel");
            return;
        }

        PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
        builder.setAspectRatio(new Rational(16, 9));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setAutoEnterEnabled(true);
            builder.setSeamlessResizeEnabled(true);
        }

        activity.enterPictureInPictureMode(builder.build());
        promise.resolve(true);
    }

    /**
     * Verifica se o dispositivo suporta PiP.
     */
    @ReactMethod
    public void isPipSupported(Promise promise) {
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O);
    }
}
