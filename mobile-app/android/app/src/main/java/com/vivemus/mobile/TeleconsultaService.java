package com.vivemus.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service que mantém a conexão WebRTC da teleconsulta ativa
 * quando o app está minimizado ou em modo PiP.
 *
 * Exibe uma notificação persistente "Vivemus: Sua consulta está em andamento"
 * para manter a CPU e a rede ativas.
 */
public class TeleconsultaService extends Service {

    private static final String CHANNEL_ID = "vivemus_teleconsulta";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onCreate() {
        super.onCreate();
        criarCanalNotificacao();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = criarNotificacao();
        startForeground(NOTIFICATION_ID, notification);

        // START_STICKY: Android reinicia o service se o sistema matar o processo
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopForeground(true);
    }

    /**
     * Cria o canal de notificacao (obrigatorio Android 8+).
     */
    private void criarCanalNotificacao() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Teleconsulta Ativa",
                NotificationManager.IMPORTANCE_LOW  // Low = sem som, apenas visual
            );
            channel.setDescription("Notificação exibida durante teleconsultas ativas");
            channel.setShowBadge(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Cria a notificacao persistente com acao para voltar ao app.
     */
    private Notification criarNotificacao() {
        // Intent para abrir o app ao clicar na notificacao
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vivemus")
            .setContentText("Sua consulta está em andamento")
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }
}
