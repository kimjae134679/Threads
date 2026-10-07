package kr.threads.review;
import android.content.Context;
/** App-local session only. Constructing it never makes network calls or keys. */
public final class NativeSession {
 private static NativeSession instance;public final AndroidTokenVault vault;public final GithubHttp http;public final DeviceFlowController auth;
 private NativeSession(Context c){vault=new AndroidTokenVault(c,ConnectionConfig::approved);http=new GithubHttp();auth=new DeviceFlowController(ConnectionConfig.CLIENT_ID,System::currentTimeMillis,http,vault,http,ConnectionConfig::approved);}
 public static synchronized NativeSession get(Context c){if(instance==null)instance=new NativeSession(c.getApplicationContext());return instance;}
}
