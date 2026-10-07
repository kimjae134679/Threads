package kr.threads.review;
import android.app.Activity;import android.os.*;import android.content.Intent;import android.net.Uri;import android.widget.*;
import java.util.concurrent.*;import java.util.concurrent.atomic.AtomicLong;
/** Native official browser login. Shipped activation is disabled. */
public final class ConnectionActivity extends Activity {
 private final ExecutorService worker=Executors.newSingleThreadExecutor();
 private final Handler handler=new Handler(Looper.getMainLooper());
 private final AtomicLong attempts=new AtomicLong();private volatile boolean destroyed;
 private TextView status;private Button login;private NativeSession session;
 @Override public void onCreate(Bundle saved){
  super.onCreate(saved);session=NativeSession.get(this);
  LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(24,24,24,24);
  ScrollView scroll=new ScrollView(this);scroll.addView(box);setContentView(scroll);
  TextView title=new TextView(this);title.setText("GitHub 연결 준비");title.setTextSize(24);box.addView(title);
  status=new TextView(this);status.setText(ConnectionConfig.approved()?"공식 로그인 전 · 실제 동기화 미확인":"준비 코드 구현 · 실제 연결 미승인/미설정");box.addView(status);
  TextView steps=new TextView(this);steps.setText("브릿지·PC 명령 저장소와 분리된 전용 비공개 리뷰 저장소만 사용합니다.\n\n별도 승인: 전용 저장소 생성 → private GitHub App 등록(Device Flow, 만료 토큰, webhook 끔) → 그 저장소만 설치(Contents 읽기/쓰기, Metadata 읽기) → 사용자 공식 로그인.\n\n저장소 전체 쓰기 권한입니다. 토큰을 채팅이나 APK에 넣지 않습니다. 로그인 후 이 기기의 Android Keystore로 보호합니다. 실제 게시 기능은 없습니다.\n\n");box.addView(steps);TextView readiness=new TextView(this);readiness.setText(ConnectionConfig.approved()?"승인된 설정 적용 · 공식 로그인 후 실제 동기화 결과를 확인하세요.":"현재 빌드는 연결 미승인/미설정 · 로그인·키/토큰 생성·업로드 비활성");box.addView(readiness);
  login=new Button(this);login.setText("공식 GitHub 로그인 시작");login.setEnabled(ConnectionConfig.approved());login.setOnClickListener(v->startLogin());box.addView(login);
  Button cancel=new Button(this);cancel.setText("대기 취소");cancel.setOnClickListener(v->{invalidate();login.setEnabled(ConnectionConfig.approved());status.setText("대기 취소 · 기존 평가 큐 보존");});box.addView(cancel);
  Button logout=new Button(this);logout.setText("기기 연결 정보 삭제");logout.setEnabled(ConnectionConfig.approved());logout.setOnClickListener(v->{long id=invalidate();login.setEnabled(false);worker.execute(()->{try{session.auth.logout();show(id,()->{login.setEnabled(ConnectionConfig.approved());status.setText("기기 연결 정보 삭제 · GitHub 앱 승인 철회는 GitHub 설정에서");});}catch(Exception e){showError(id);}});});box.addView(logout);
  Button back=new Button(this);back.setText("리뷰로 돌아가기");back.setOnClickListener(v->finish());box.addView(back);
 }
 private boolean active(long id){return !destroyed&&attempts.get()==id;}
 private long invalidate(){long id=attempts.incrementAndGet();session.auth.cancel();handler.removeCallbacksAndMessages(null);return id;}
 private void show(long id,Runnable action){runOnUiThread(()->{if(active(id))action.run();});}
 private void startLogin(){
  long id=invalidate();login.setEnabled(false);
  worker.execute(()->{if(!active(id))return;try{
   DeviceFlowController.DeviceCode code=session.auth.start();if(!active(id)){session.auth.cancel();return;}
   show(id,()->{status.setText("GitHub 공식 페이지에서 코드 입력: "+code.userCode+"\n로그인 대기 · 아직 연결되지 않았습니다.");try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(code.verificationUri)));}catch(Exception e){invalidate();login.setEnabled(ConnectionConfig.approved());status.setText("공식 브라우저를 열 수 없어 로그인 대기를 취소했습니다.");}});
   schedulePoll(id);
  }catch(Exception e){showError(id);}});
 }
 private void schedulePoll(long id){
  if(!active(id))return;
  handler.postDelayed(()->{if(!active(id))return;worker.execute(()->{if(!active(id))return;try{
   String result=session.auth.poll();if(!active(id))return;
   if(result.equals("pending"))schedulePoll(id);else show(id,()->status.setText("공식 인증 및 전용 저장소 확인 완료 · 실제 리뷰 동기화 결과는 리뷰 화면에서 확인"));
  }catch(Exception e){showError(id);}});},Math.max(1000,session.auth.waitMillis()));
 }
 private void showError(long id){show(id,()->{login.setEnabled(ConnectionConfig.approved());status.setText("인증/보호 저장 확인 실패 · 연결 완료로 처리하지 않았습니다. 다시 로그인하세요.");});}
 @Override public void onDestroy(){destroyed=true;invalidate();worker.shutdown();super.onDestroy();}
}