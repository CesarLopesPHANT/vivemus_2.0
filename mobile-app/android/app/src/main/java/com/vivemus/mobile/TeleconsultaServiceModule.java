package com.vivemus.mobile;

import android.content.Intent;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * Modulo nativo que controla o Foreground Service de teleconsulta.
 *
 * Uso no JS:
 *   import { NativeModules } from 'react-native';
 *   const { TeleconsultaServiceModule } = NativeModules;
 *   TeleconsultaServiceModule.iniciar();   // Inicia o service + notificacao
 *   TeleconsultaServiceModule.parar();     // Para o service
 */
public class TeleconsultaServiceModule extends ReactContextBaseJavaModule {

    public TeleconsultaServiceModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return "TeleconsultaServiceModule";
    }

    /**
     * Inicia o Foreground Service com notificacao persistente.
     * Mantém CPU e rede ativos para a teleconsulta em segundo plano.
     */
    @ReactMethod
    public void iniciar(Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, TeleconsultaService.class);

            // ContextCompat.startForegroundService lida com a diferenca entre
            // startService (< Android 8) e startForegroundService (>= Android 8)
            ContextCompat.startForegroundService(context, serviceIntent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SERVICE_ERROR", "Erro ao iniciar o servico: " + e.getMessage());
        }
    }

    /**
     * Para o Foreground Service e remove a notificacao.
     */
    @ReactMethod
    public void parar(Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            Intent serviceIntent = new Intent(context, TeleconsultaService.class);
            context.stopService(serviceIntent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SERVICE_ERROR", "Erro ao parar o servico: " + e.getMessage());
        }
    }
}
