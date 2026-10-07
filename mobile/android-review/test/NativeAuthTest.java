package kr.threads.review;
import java.util.*;
// JVM mocks only: never AndroidKeyStore, network, or real credentials.
public final class NativeAuthTest {
 static int assertions=0;static void check(boolean b){assertions++;if(!b)throw new AssertionError("fixture assertion "+assertions);}
 static Map<String,Object> map(Object...p){Map<String,Object> m=new HashMap<>();for(int i=0;i<p.length;i+=2)m.put((String)p[i],p[i+1]);return m;}
 static class Env implements DeviceFlowController.Clock,DeviceFlowController.Endpoint,DeviceFlowController.Vault,DeviceFlowController.Verifier {
  long now=100000;int posts=0,saves=0,verifies=0,clears=0;boolean approval=true;String error=null;DeviceFlowController.Tokens stored;
  public long now(){return now;}public boolean approved(){return approval;}
  public Map<String,Object> post(String path,Map<String,String> form){posts++;check(!form.containsKey("client_secret"));if(error!=null)return map("error",error);
   if(path.equals("/login/device/code"))return map("device_code","fixture-device","user_code","TEST-CODE","verification_uri","https://github.com/login/device","expires_in",900,"interval",5);
   return map("access_token","fixture-access-only","refresh_token","fixture-refresh-only","expires_in",28800,"refresh_token_expires_in",15897600,"token_type","bearer","scope","");
  }
  public DeviceFlowController.Tokens load(){return stored;}public void save(DeviceFlowController.Tokens t){saves++;stored=t;}public void clear(){clears++;stored=null;}
  public void verify(String token){verifies++;check(token.equals("fixture-access-only"));}
  DeviceFlowController controller(){return new DeviceFlowController("fixture-public-client",this,this,this,this,()->approval);}
 }
 interface Throwing{void run()throws Exception;}static void fails(Throwing r)throws Exception{try{r.run();throw new AssertionError("must fail");}catch(DeviceFlowController.AuthException expected){assertions++;}}
 public static void main(String[]args)throws Exception{
  Env blocked=new Env();blocked.approval=false;fails(()->blocked.controller().start());check(blocked.posts==0&&blocked.saves==0);
  Env e=new Env();DeviceFlowController c=e.controller();DeviceFlowController.DeviceCode d=c.start();check(d.userCode.equals("TEST-CODE"));fails(()->c.poll());check(e.posts==1);e.now+=5000;e.error="authorization_pending";check(c.poll().equals("pending"));check(e.saves==0);
  e.now+=5000;e.error="slow_down";check(c.poll().equals("pending"));e.now+=5000;fails(()->c.poll());e.now+=5000;e.error=null;check(c.poll().equals("connected"));check(e.saves==1&&e.verifies==1);check(c.accessToken().equals("fixture-access-only"));
  e.now+=28800000;check(c.accessToken().equals("fixture-access-only"));check(e.saves==2&&e.verifies==2);c.logout();check(e.stored==null);fails(()->c.accessToken());
  Env cancelled=new Env();DeviceFlowController cc=cancelled.controller();cc.start();cc.cancel();cancelled.now+=5000;fails(()->cc.poll());check(cancelled.saves==0);
  Env expired=new Env();DeviceFlowController ec=expired.controller();ec.start();expired.now+=901000;fails(()->ec.poll());check(expired.posts==1);
  Env denied=new Env();DeviceFlowController dc=denied.controller();dc.start();denied.now+=5000;denied.error="access_denied";fails(()->dc.poll());check(denied.saves==0);
  Env bad=new Env(){public Map<String,Object> post(String p,Map<String,String> f){return map("verification_uri","https://evil.invalid","device_code","x","user_code","x","expires_in",900,"interval",5);}};fails(()->bad.controller().start());
  Env refresh=new Env();DeviceFlowController rc=refresh.controller();rc.start();refresh.now+=5000;rc.poll();refresh.now+=28800000;refresh.error="bad_refresh_token";fails(()->rc.accessToken());check(refresh.stored==null);
  final DeviceFlowController[] race=new DeviceFlowController[1];Env racing=new Env(){public Map<String,Object> post(String p,Map<String,String> f){Map<String,Object> r=super.post(p,f);if(p.equals("/login/oauth/access_token"))race[0].cancel();return r;}};race[0]=racing.controller();race[0].start();racing.now+=5000;fails(()->race[0].poll());check(racing.saves==0);
  final DeviceFlowController[] saving=new DeviceFlowController[1];Env saveRace=new Env(){public void save(DeviceFlowController.Tokens t){super.save(t);saving[0].cancel();}};saving[0]=saveRace.controller();saving[0].start();saveRace.now+=5000;fails(()->saving[0].poll());check(saveRace.stored==null);
  final DeviceFlowController[] starting=new DeviceFlowController[1];Env startRace=new Env(){public Map<String,Object> post(String p,Map<String,String> f){Map<String,Object> r=super.post(p,f);if(p.equals("/login/device/code"))starting[0].cancel();return r;}};starting[0]=startRace.controller();fails(()->starting[0].start());startRace.now+=5000;fails(()->starting[0].poll());check(startRace.saves==0);
  System.out.println("Native auth mock PASS: "+assertions+" assertions; no real auth/key/token/network");
 }
}
