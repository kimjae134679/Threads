package kr.threads.review;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import java.io.IOException;
public final class ReviewActivity extends Activity {
 private WebView view;
 @Override public void onCreate(Bundle saved){
  super.onCreate(saved);view=new WebView(this);setContentView(view);
  WebView.setWebContentsDebuggingEnabled(false);
  WebSettings s=view.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
  s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  // INTERNET is a normal declaration prepared for the user's requested feature.
  // Actual network loads remain disabled because no approved service/auth route exists.
  s.setBlockNetworkLoads(true);
  view.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest request){
    String url=request.getUrl().toString(),prefix="https://review.local.invalid/";
    if(!url.startsWith(prefix))return new WebResourceResponse("text/plain","UTF-8",null);
    String name=url.substring(prefix.length());if(!name.matches("[a-zA-Z0-9.-]+"))return new WebResourceResponse("text/plain","UTF-8",null);
    String type=name.endsWith(".html")?"text/html":name.endsWith(".js")?"application/javascript":name.endsWith(".css")?"text/css":"text/plain";
    try{return new WebResourceResponse(type,"UTF-8",getAssets().open(name));}catch(IOException e){return new WebResourceResponse("text/plain","UTF-8",null);}
   }
   @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;}
  });
  view.loadUrl("https://review.local.invalid/index.html");
 }
 @Override public void onDestroy(){view.destroy();super.onDestroy();}
}
