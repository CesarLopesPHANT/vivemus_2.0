package com.vivemus.mobile;

import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.WindowManager;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MainActivity extends ReactActivity {

    // Flag controlada pelo JS via PipModule para saber se a teleconsulta esta ativa
    static volatile boolean teleconsultaAtiva = false;

    @Override
    protected String getMainComponentName() {
        return "VivemusMobile";
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Para API < 27, define flags programaticamente
        // (atributos XML showWhenLocked/turnScreenOn so funcionam em API 27+)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O_MR1) {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            DefaultNewArchitectureEntryPoint.getFabricEnabled()
        );
    }

    /**
     * Ativa ou desativa FLAG_SECURE para prevenir capturas de tela
     * durante teleconsultas e visualizacao de prontuarios.
     * Chamado pelo PipModule via bridge React Native.
     */
    void setScreenSecure(boolean secure) {
        runOnUiThread(() -> {
            if (secure) {
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            } else {
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
        });
    }

    /**
     * Mantem a tela ligada durante teleconsulta para evitar auto-lock.
     * Chamado pelo PipModule.setTeleconsultaAtiva().
     */
    void setKeepScreenOn(boolean keepOn) {
        runOnUiThread(() -> {
            if (keepOn) {
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } else {
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
    }

    /**
     * Quando o usuario pressiona Home ou troca de app durante uma teleconsulta ativa,
     * entra automaticamente em Picture-in-Picture (estilo Uber/Meet).
     */
    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (teleconsultaAtiva && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            enterPipMode();
        }
    }

    /**
     * Entra no modo Picture-in-Picture com aspect ratio 16:9 para video.
     */
    private void enterPipMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
            builder.setAspectRatio(new Rational(16, 9));

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                builder.setAutoEnterEnabled(true);
                builder.setSeamlessResizeEnabled(true);
            }

            enterPictureInPictureMode(builder.build());
        }
    }

    /**
     * Notifica o React Native quando o modo PiP muda (entrou ou saiu).
     * O JS usa esse evento para esconder/mostrar a tab bar e outros controles.
     */
    @Override
    public void onPictureInPictureModeChanged(boolean isInPipMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPipMode, newConfig);

        ReactContext reactContext = getReactInstanceManager().getCurrentReactContext();
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onPipModeChanged", isInPipMode);
        }
    }
}
