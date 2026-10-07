package kr.threads.review;
import java.util.*;import java.util.concurrent.atomic.AtomicLong;
/** Pure Java protocol; all side effects are injected. No secret/client credentials. */
public final class DeviceFlowController {
 public interface Clock { long now(); }
 public interface Consent { boolean approved(); }
 public interface Endpoint { Map<String,Object> post(String path,Map<String,String> form)throws Exception; }
 public interface Vault { Tokens load()throws Exception; void save(Tokens value)throws Exception; void clear()throws Exception; }
 public interface Verifier { void verify(String accessToken)throws Exception; }
 public static final class AuthException extends Exception { public AuthException(String safe){super(safe);} }
 public static final class Tokens {
  public final String access,refresh;public final long expiresAt,refreshExpiresAt;
  public Tokens(String a,String r,long e,long re){access=a;refresh=r;expiresAt=e;refreshExpiresAt=re;}
 }
 public static final class DeviceCode {
  public final String userCode,verificationUri;public final long expiresAt;
  DeviceCode(String u,String v,long e){userCode=u;verificationUri=v;expiresAt=e;}
 }
 private final String clientId;private final Clock clock;private final Endpoint endpoint;private final Vault vault;private final Verifier verifier;private final Consent consent;
 private volatile String deviceCode=null;private long deadline,nextPoll,interval,deviceGeneration;private final AtomicLong generation=new AtomicLong();
 public DeviceFlowController(String id,Clock c,Endpoint e,Vault v,Verifier verify,Consent grant){clientId=id;clock=c;endpoint=e;vault=v;verifier=verify;consent=grant;}
 private void allowed()throws AuthException{if(!consent.approved()||clientId==null||clientId.isEmpty())throw new AuthException("Connection activation not approved");}
 private static String text(Map<String,Object> r,String key)throws AuthException{Object v=r.get(key);if(!(v instanceof String)||((String)v).isEmpty()||((String)v).length()>4096)throw new AuthException("Invalid authorization response");return (String)v;}
 private static long seconds(Map<String,Object> r,String key,long max)throws AuthException{Object v=r.get(key);if(!(v instanceof Number))throw new AuthException("Expiring authorization required");long n=((Number)v).longValue();if(n<1||n>max||((Number)v).doubleValue()!=n)throw new AuthException("Invalid authorization duration");return n*1000;}
 private Map<String,String> form(String...pairs){Map<String,String> f=new HashMap<>();f.put("client_id",clientId);for(int i=0;i<pairs.length;i+=2)f.put(pairs[i],pairs[i+1]);return f;}
 public synchronized DeviceCode start()throws Exception{
  allowed();cancel();long attempt=generation.get();Map<String,Object> r=endpoint.post("/login/device/code",form("scope","offline_access"));
  if(generation.get()!=attempt)throw new AuthException("Device authorization cancelled");
  if(r.containsKey("error"))throw new AuthException("Device authorization unavailable");
  String uri=text(r,"verification_uri");if(!uri.equals("https://github.com/login/device"))throw new AuthException("Unexpected verification host");
  String code=text(r,"device_code"),user=text(r,"user_code");long expires=seconds(r,"expires_in",900),every=seconds(r,"interval",900);
  deviceGeneration=attempt;deviceCode=code;deadline=clock.now()+expires;interval=every;nextPoll=clock.now()+every;if(generation.get()!=attempt){deviceCode=null;throw new AuthException("Device authorization cancelled");}return new DeviceCode(user,uri,deadline);
 }
 public synchronized long waitMillis(){return Math.max(0,nextPoll-clock.now());}
 public synchronized String poll()throws Exception{
  allowed();if(deviceCode==null||generation.get()!=deviceGeneration||clock.now()>=deadline){cancel();throw new AuthException("Device code cancelled or expired");}
  if(clock.now()<nextPoll)throw new AuthException("Wait for the authorization interval");
  long attempt=generation.get();nextPoll=clock.now()+interval;Map<String,Object> r=endpoint.post("/login/oauth/access_token",form("device_code",deviceCode,"grant_type","urn:ietf:params:oauth:grant-type:device_code"));
  if(generation.get()!=attempt||deviceCode==null)throw new AuthException("Authorization cancelled");
  Object error=r.get("error");if("authorization_pending".equals(error))return "pending";
  if("slow_down".equals(error)){interval+=5000;if(r.get("interval") instanceof Number)interval=Math.max(interval,seconds(r,"interval",900));nextPoll=clock.now()+interval;return "pending";}
  if(error!=null){cancel();throw new AuthException("Authorization denied or expired; start again");}
  try{Tokens t=parseTokens(r);verifier.verify(t.access);allowed();if(generation.get()!=attempt||deviceCode==null)throw new AuthException("Authorization cancelled");vault.save(t);if(generation.get()!=attempt||deviceCode==null){vault.clear();throw new AuthException("Authorization cancelled during protected save");}cancel();return "connected";}catch(Exception e){cancel();throw new AuthException("Authorization verification or protected save failed");}
 }
 private Tokens parseTokens(Map<String,Object> r)throws Exception{
  if(!"bearer".equals(r.get("token_type"))||r.get("scope")!=null&&!"".equals(r.get("scope")))throw new AuthException("Unexpected authorization type");
  return new Tokens(text(r,"access_token"),text(r,"refresh_token"),clock.now()+seconds(r,"expires_in",28800),clock.now()+seconds(r,"refresh_token_expires_in",15897600));
 }
 public synchronized String accessToken()throws Exception{
  allowed();Tokens t=vault.load();if(t==null)throw new AuthException("Official login required");if(t.expiresAt>clock.now()+60000)return t.access;
  if(t.refreshExpiresAt<=clock.now()){vault.clear();throw new AuthException("Authorization expired; official login required");}
  long attempt=generation.get();try{Map<String,Object> r=endpoint.post("/login/oauth/access_token",form("refresh_token",t.refresh,"grant_type","refresh_token"));if(r.containsKey("error"))throw new AuthException("Refresh failed");Tokens next=parseTokens(r);verifier.verify(next.access);allowed();if(generation.get()!=attempt)throw new AuthException("Authorization cancelled");vault.save(next);if(generation.get()!=attempt)throw new AuthException("Authorization cancelled during protected save");return next.access;}
  catch(Exception e){vault.clear();throw new AuthException("Authorization refresh failed; official login required");}
 }
 public void cancel(){generation.incrementAndGet();deviceCode=null;}
 public synchronized void logout()throws Exception{cancel();vault.clear();}
}
