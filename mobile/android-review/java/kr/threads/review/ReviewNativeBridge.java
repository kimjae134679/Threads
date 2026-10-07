package kr.threads.review;
import android.app.Activity;import android.content.Intent;import android.webkit.JavascriptInterface;import org.json.JSONObject;
/** Packaged-page bridge: no tokens/auth endpoints/config mutation exposed. */
public final class ReviewNativeBridge {
 private final Activity activity;private final NativeSession session;
 public ReviewNativeBridge(Activity a){activity=a;session=NativeSession.get(a);}
 @JavascriptInterface public String config(){try{return new JSONObject().put("approved",ConnectionConfig.approved()&&session.vault.hasSaved()).put("dedicatedReviewRepository",ConnectionConfig.DEDICATED_REPOSITORY_APPROVED).put("owner",ConnectionConfig.OWNER).put("repo",ConnectionConfig.REPO).put("repositoryId",ConnectionConfig.REPOSITORY_ID).put("branch",ConnectionConfig.BRANCH).toString();}catch(Exception e){return "{\"approved\":false}";}}
 @JavascriptInterface public void openConnection(){activity.runOnUiThread(()->activity.startActivity(new Intent(activity,ConnectionActivity.class)));}
 @JavascriptInterface public String api(String input){
  try{if(!ConnectionConfig.approved())throw new DeviceFlowController.AuthException("Not approved");if(input==null||input.length()>1100000)throw new Exception();JSONObject j=new JSONObject(input);String path=j.getString("path"),method=j.optString("method","GET");JSONObject body=j.optJSONObject("body");String token=session.auth.accessToken();session.http.verify(token);return new JSONObject().put("ok",true).put("data",session.http.api(path,method,body,token)).toString();}
  catch(Exception e){int status=e instanceof GithubHttp.ApiException?((GithubHttp.ApiException)e).status:e instanceof DeviceFlowController.AuthException?401:0;return "{\"ok\":false,\"status\":"+status+",\"message\":\"Native GitHub connection unavailable\"}";}
 }
}
