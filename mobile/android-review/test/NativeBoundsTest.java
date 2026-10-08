package kr.threads.review;
import java.io.IOException;
public final class NativeBoundsTest {
 private static void denied(RunnableIO r)throws Exception{try{r.run();throw new AssertionError("Oversized request accepted");}catch(IOException expected){}}
 private interface RunnableIO{void run()throws Exception;}
 public static void main(String[] args)throws Exception{
  String ledger=new String(new char[1806272]).replace('\0','x');
  ReviewRequestBounds.bridge(ledger);ReviewRequestBounds.ledger(ledger,"utf-8");
  ReviewRequestBounds.body("api.github.com","/repos/a/b/git/blobs",new byte[ledger.length()+40]);
  denied(()->ReviewRequestBounds.body("api.github.com","/repos/a/b/git/trees",new byte[1100001]));
  denied(()->ReviewRequestBounds.body("github.com","/login/device/code",new byte[1100001]));
  denied(()->ReviewRequestBounds.ledger("abc","base64"));
  denied(()->ReviewRequestBounds.ledger(new String(new char[ReviewRequestBounds.STATE_BYTES/3+1]).replace('\0','한'),"utf-8"));
  denied(()->ReviewRequestBounds.bridge(new String(new char[ReviewRequestBounds.WIRE_BYTES+1])));
  denied(()->ReviewRequestBounds.body("api.github.com","/repos/a/b/git/blobs",new byte[ReviewRequestBounds.WIRE_BYTES+1]));
  if(ReviewRequestBounds.STATE_BYTES!=8*1024*1024)throw new AssertionError("Protocol limit differs");
  long imageEncoded=((25L*1024*1024+2)/3)*4,wrappedJsonBytes=imageEncoded+((imageEncoded+59)/60)*5+4096;
  if(ReviewRequestBounds.RESPONSE_BYTES<wrappedJsonBytes||ReviewRequestBounds.RESPONSE_BYTES>40*1024*1024)throw new AssertionError("Wrapped maximum PNG response must fit bounded native reader");
  System.out.println("Native bounds mock PASS");
 }
}
