package kr.threads.review;
import android.app.Activity;
import android.os.*;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.widget.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
/** Native official browser login. Shipped activation remains disabled. */
public final class ConnectionActivity extends Activity {
 private final ExecutorService worker=Executors.newSingleThreadExecutor();
 private final Handler handler=new Handler(Looper.getMainLooper());
 private final AtomicLong attempts=new AtomicLong();private volatile boolean destroyed;
 private TextView status;private Button login,cancel,disconnect;private NativeSession session;
 private int foreground,muted,accent,paper,border;private boolean pending;
 @Override public void onCreate(Bundle saved){
  NativeWindowInsets.setTheme(this);super.onCreate(saved);session=NativeSession.get(this);
  boolean dark=NativeWindowInsets.dark(this);
  foreground=Color.parseColor(dark?"#e5ede0":"#202921");muted=Color.parseColor(dark?"#afbdab":"#53604f");
  accent=Color.parseColor(dark?"#91cda8":"#276345");paper=Color.parseColor(dark?"#232c25":"#fffefa");border=Color.parseColor(dark?"#596b5c":"#a3afa0");
  FrameLayout root=new FrameLayout(this);ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);
  LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(20),dp(20),dp(20),dp(24));
  scroll.addView(box);root.addView(scroll);setContentView(root);NativeWindowInsets.apply(this,root);
  TextView title=text("연결",22,foreground);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);box.addView(title);
  status=text(ConnectionConfig.approved()?session.vault.hasSaved()?"저장된 로그인 정보가 있습니다. 자료 목록에서 연결 상태를 확인하세요.":"자료를 가져오려면 GitHub에 한 번 로그인하세요.":"아직 연결할 수 없습니다. 계정과 저장소 연결 설정을 마친 뒤 이용할 수 있습니다.",16,foreground);
  status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);box.addView(status);
  if(ConnectionConfig.approved()){
   login=button("GitHub로 로그인",true);login.setOnClickListener(v->startLogin());box.addView(login);
   cancel=button("로그인 취소",false);cancel.setVisibility(View.GONE);cancel.setOnClickListener(v->{invalidate();updateActions(false);status.setText("로그인을 취소했습니다. 저장된 평가는 그대로 남아 있습니다.");});box.addView(cancel);
   disconnect=button("이 기기 연결 해제",false);disconnect.setOnClickListener(v->logout());box.addView(disconnect);
   updateActions(false);
  }
  Button back=button("자료로 돌아가기",false);back.setOnClickListener(v->finish());box.addView(back);
  Button manage=button("연결 관리 보기",false);box.addView(manage);
  TextView management=text(ConnectionConfig.approved()?"로그인 정보는 이 기기에 안전하게 저장됩니다. 연결 해제는 이 기기의 로그인 정보만 지웁니다. GitHub 접근 권한은 GitHub 설정에서 관리할 수 있습니다.":"이 버전은 연결 설정이 완료되지 않았습니다. 연결 가능한 버전이 준비되면 GitHub 로그인 버튼이 표시됩니다.",14,muted);
  management.setVisibility(View.GONE);box.addView(management);
  manage.setOnClickListener(v->{boolean open=management.getVisibility()!=View.VISIBLE;management.setVisibility(open?View.VISIBLE:View.GONE);manage.setText(open?"연결 관리 접기":"연결 관리 보기");});
 }
 private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
 private TextView text(String value,int size,int color){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setLineSpacing(dp(4),1);t.setPadding(0,0,0,dp(16));return t;}
 private Button button(String label,boolean primary){
  Button b=new Button(this);b.setText(label);b.setTextSize(16);b.setAllCaps(false);b.setMinHeight(dp(48));b.setPadding(dp(16),dp(12),dp(16),dp(12));
  b.setTextColor(primary?Color.parseColor(NativeWindowInsets.dark(this)?"#152a1d":"#ffffff"):foreground);
  GradientDrawable shape=new GradientDrawable();shape.setColor(primary?accent:paper);shape.setCornerRadius(dp(12));shape.setStroke(dp(1),primary?accent:border);b.setBackground(shape);
  LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,LinearLayout.LayoutParams.WRAP_CONTENT);params.bottomMargin=dp(12);b.setLayoutParams(params);return b;
 }
 private void updateActions(boolean waiting){
  pending=waiting;if(login==null)return;
  login.setEnabled(ConnectionConfig.approved()&&!waiting);login.setText(waiting?"로그인 확인 중…":session.vault.hasSaved()?"GitHub로 다시 로그인":"GitHub로 로그인");
  cancel.setVisibility(waiting?View.VISIBLE:View.GONE);
  disconnect.setVisibility(!waiting&&session.vault.hasSaved()?View.VISIBLE:View.GONE);
 }
 private boolean active(long id){return !destroyed&&attempts.get()==id;}
 private long invalidate(){long id=attempts.incrementAndGet();session.auth.cancel();handler.removeCallbacksAndMessages(null);return id;}
 private void show(long id,Runnable action){runOnUiThread(()->{if(active(id))action.run();});}
 private void startLogin(){
  if(!ConnectionConfig.approved()||destroyed||login==null||pending)return;
  long id=invalidate();updateActions(true);
  worker.execute(()->{if(!active(id))return;try{
   DeviceFlowController.DeviceCode code=session.auth.start();if(!active(id)){session.auth.cancel();return;}
   show(id,()->{status.setText("GitHub에서 이 코드를 입력하세요: "+code.userCode+"\n로그인을 기다리고 있습니다.");try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(code.verificationUri)));}catch(Exception e){invalidate();updateActions(false);status.setText("브라우저를 열 수 없습니다. 다시 로그인해 주세요.");}});
   schedulePoll(id);
  }catch(Exception e){showError(id);}});
 }
 private void logout(){
  if(!ConnectionConfig.approved()||destroyed||login==null||pending)return;
  long id=invalidate();login.setEnabled(false);disconnect.setEnabled(false);
  worker.execute(()->{if(!active(id))return;try{session.auth.logout();show(id,()->{disconnect.setEnabled(true);updateActions(false);status.setText("이 기기의 연결을 해제했습니다. 저장된 평가는 그대로 남아 있습니다.");});}catch(Exception e){showError(id);}});
 }
 private void schedulePoll(long id){
  if(!active(id))return;
  handler.postDelayed(()->{if(!active(id))return;worker.execute(()->{if(!active(id))return;try{
   String result=session.auth.poll();if(!active(id))return;
   if(result.equals("pending"))schedulePoll(id);else show(id,()->{updateActions(false);status.setText("로그인을 확인했습니다.");finish();});
  }catch(Exception e){showError(id);}});},Math.max(1000,session.auth.waitMillis()));
 }
 private void showError(long id){show(id,()->{disconnect.setEnabled(true);updateActions(false);status.setText("로그인을 확인하지 못했습니다. 다시 시도해 주세요.");});}
 @Override public void onDestroy(){destroyed=true;invalidate();worker.shutdown();super.onDestroy();}
}
