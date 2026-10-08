package kr.threads.review;
import java.io.*;import java.net.*;import java.util.*;import javax.net.ssl.HttpsURLConnection;import org.json.*;
/** Fixed hosts, normal TLS verification, no redirects, bounded bodies, no logs. */
public final class GithubHttp implements DeviceFlowController.Endpoint,DeviceFlowController.Verifier {
 private static volatile long apiCooldownUntil=0;
 public static final class ApiException extends Exception{public final int status;ApiException(int s){super("GitHub request unavailable ("+s+")");status=s;}}
 private void allowed()throws Exception{if(!ConnectionConfig.approved())throw new DeviceFlowController.AuthException("Actual GitHub connection not approved");}
 private JSONObject request(String host,String path,String method,byte[] body,String contentType,String bearer)throws Exception{
  allowed();ReviewRequestBounds.body(host,path,body);if(host.equals("api.github.com")&&System.currentTimeMillis()<apiCooldownUntil)throw new ApiException(429);HttpsURLConnection c=(HttpsURLConnection)new URL("https://"+host+path).openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(15000);c.setReadTimeout(20000);c.setRequestMethod(method);c.setRequestProperty("Accept","application/vnd.github+json");c.setRequestProperty("User-Agent","Threads-Review-Android");c.setRequestProperty("X-GitHub-Api-Version","2026-03-10");
  if(bearer!=null)c.setRequestProperty("Authorization","Bearer "+bearer);
  try{
   if(body!=null){c.setDoOutput(true);c.setRequestProperty("Content-Type",contentType);c.setFixedLengthStreamingMode(body.length);try(OutputStream out=c.getOutputStream()){out.write(body);}}
   int status=c.getResponseCode();if(host.equals("api.github.com")&&(status==403||status==429||"0".equals(c.getHeaderField("x-ratelimit-remaining")))){
    long until=System.currentTimeMillis()+60000;try{String retry=c.getHeaderField("Retry-After"),reset=c.getHeaderField("x-ratelimit-reset");if(retry!=null)until=Math.max(until,System.currentTimeMillis()+Long.parseLong(retry)*1000);if(reset!=null&&"0".equals(c.getHeaderField("x-ratelimit-remaining")))until=Math.max(until,Long.parseLong(reset)*1000);}catch(NumberFormatException ignored){}apiCooldownUntil=until;
   }if(status<200||status>=300)throw new ApiException(status);
   if(c.getContentLengthLong()>ReviewRequestBounds.RESPONSE_BYTES)throw new IOException("Response size limit");ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream in=c.getInputStream()){byte[] buffer=new byte[8192];for(int n;(n=in.read(buffer))!=-1;){if(bytes.size()+n>ReviewRequestBounds.RESPONSE_BYTES)throw new IOException("Response size limit");bytes.write(buffer,0,n);}}
   return new JSONObject(new String(bytes.toByteArray(),"UTF-8"));
  }finally{c.disconnect();}
 }
 public Map<String,Object> post(String path,Map<String,String> form)throws Exception{
  if(!path.equals("/login/device/code")&&!path.equals("/login/oauth/access_token")||form.containsKey("client_secret"))throw new IOException("Unexpected auth route");StringBuilder data=new StringBuilder();for(Map.Entry<String,String> e:form.entrySet()){if(data.length()>0)data.append('&');data.append(URLEncoder.encode(e.getKey(),"UTF-8")).append('=').append(URLEncoder.encode(e.getValue(),"UTF-8"));}
  JSONObject j=request("github.com",path,"POST",data.toString().getBytes("UTF-8"),"application/x-www-form-urlencoded",null);Map<String,Object> result=new HashMap<>();for(Iterator<String> i=j.keys();i.hasNext();){String k=i.next();result.put(k,j.get(k));}return result;
 }
 public void verify(String token)throws Exception{
  JSONObject r=request("api.github.com",ConnectionConfig.prefix(),"GET",null,null,token);
  if(!r.getBoolean("private")||r.getLong("id")!=ConnectionConfig.REPOSITORY_ID||!r.getJSONObject("owner").getString("login").equalsIgnoreCase(ConnectionConfig.OWNER)||!r.getString("name").equalsIgnoreCase(ConnectionConfig.REPO)||r.getString("default_branch").equals(ConnectionConfig.BRANCH))throw new IOException("Dedicated repository identity/visibility mismatch");
 }
 public JSONObject api(String path,String method,JSONObject body,String token)throws Exception{
  allowed();String p=ConnectionConfig.prefix(),relative=path.startsWith(p)?path.substring(p.length()):"INVALID",ref="heads/"+ConnectionConfig.BRANCH;
  boolean read=method.equals("GET")&&(relative.isEmpty()||relative.equals("/git/ref/"+ref)||relative.matches("/git/(commits|blobs)/[a-f0-9]{40}")||relative.matches("/contents/mobile-review/state\\.json\\?ref=[a-f0-9]{40}"));
  boolean create=method.equals("POST")&&Arrays.asList("/git/blobs","/git/trees","/git/commits").contains(relative);
  boolean patch=method.equals("PATCH")&&relative.equals("/git/refs/"+ref)&&body!=null&&body.has("force")&&!body.getBoolean("force")&&body.getString("sha").matches("[a-f0-9]{40}");
  if(!read&&!create&&!patch)throw new IOException("Native API route not allowed");
  if(create&&relative.equals("/git/blobs")){if(body==null)throw new IOException("Review body missing");ReviewRequestBounds.ledger(body.getString("content"),body.getString("encoding"));}
  if(create&&relative.equals("/git/trees")){JSONArray tree=body.getJSONArray("tree");if(tree.length()!=1||!tree.getJSONObject(0).getString("path").equals("mobile-review/state.json"))throw new IOException("Native write path not allowed");}
  return request("api.github.com",path,method,body==null?null:body.toString().getBytes("UTF-8"),"application/json",token);
 }
}
