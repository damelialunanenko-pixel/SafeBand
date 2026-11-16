package expo.modules.safebandsms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.provider.Telephony
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Minimal SMS bridge for SafeBand (Android only).
 *
 * - startListening(): registers a runtime BroadcastReceiver for SMS_RECEIVED while the app
 *   process is alive and emits "onSmsReceived" { sender, body, timestamp }.
 * - readInbox(sinceMs, limit): reads already-received SMS from the inbox, so messages that
 *   arrived while the app was closed can be processed on next launch.
 *
 * Requires RECEIVE_SMS / READ_SMS runtime permissions (requested from JS).
 */
class SafebandSmsModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  override fun definition() = ModuleDefinition {
    Name("SafebandSms")

    Events("onSmsReceived")

    Function("isListening") { receiver != null }

    Function("startListening") {
      if (receiver != null) return@Function true
      val smsReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
          if (intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
          val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
          // A long SMS arrives as several parts — join them per sender.
          parts.filterNotNull()
            .groupBy { it.displayOriginatingAddress ?: it.originatingAddress ?: "" }
            .forEach { (sender, messages) ->
              val body = messages.joinToString("") { it.displayMessageBody ?: it.messageBody ?: "" }
              val timestamp = messages.minOfOrNull { it.timestampMillis } ?: System.currentTimeMillis()
              sendEvent(
                "onSmsReceived",
                mapOf("sender" to sender, "body" to body, "timestamp" to timestamp.toDouble())
              )
            }
        }
      }
      val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        // SMS_RECEIVED is sent by the system, so the receiver must be exported.
        context.registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED)
      } else {
        context.registerReceiver(smsReceiver, filter)
      }
      receiver = smsReceiver
      true
    }

    Function("stopListening") {
      unregister()
    }

    AsyncFunction("readInbox") { sinceMs: Double, limit: Int ->
      val result = mutableListOf<Map<String, Any>>()
      val cursor = context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
        "${Telephony.Sms.DATE} > ?",
        arrayOf(sinceMs.toLong().toString()),
        "${Telephony.Sms.DATE} DESC"
      )
      cursor?.use {
        val addressIdx = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val bodyIdx = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val dateIdx = it.getColumnIndexOrThrow(Telephony.Sms.DATE)
        while (it.moveToNext() && result.size < limit) {
          result.add(
            mapOf(
              "sender" to (it.getString(addressIdx) ?: ""),
              "body" to (it.getString(bodyIdx) ?: ""),
              "timestamp" to it.getLong(dateIdx).toDouble()
            )
          )
        }
      }
      result
    }

    OnDestroy {
      unregister()
    }
  }

  private fun unregister() {
    val current = receiver ?: return
    try {
      appContext.reactContext?.unregisterReceiver(current)
    } catch (_: IllegalArgumentException) {
      // Already unregistered.
    }
    receiver = null
  }
}
