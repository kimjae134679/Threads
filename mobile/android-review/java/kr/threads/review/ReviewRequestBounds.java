package kr.threads.review;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
/** Explicit state-only expansion. Other API and auth bodies retain small limits. */
public final class ReviewRequestBounds {
 public static final int STATE_BYTES=8*1024*1024,WIRE_BYTES=2*STATE_BYTES+65536,SMALL_BYTES=1100000,RESPONSE_BYTES=40*1024*1024;
 private ReviewRequestBounds(){}
 public static void bridge(String input)throws IOException{if(input==null||input.length()>WIRE_BYTES||input.getBytes(StandardCharsets.UTF_8).length>WIRE_BYTES)throw new IOException("Bridge size limit");}
 public static void ledger(String content,String encoding)throws IOException{if(!"utf-8".equals(encoding)||content==null||content.length()>STATE_BYTES||content.getBytes(StandardCharsets.UTF_8).length>STATE_BYTES)throw new IOException("Review state size/encoding limit");}
 public static void body(String host,String path,byte[] bytes)throws IOException{int limit="api.github.com".equals(host)&&path.endsWith("/git/blobs")?WIRE_BYTES:SMALL_BYTES;if(bytes!=null&&bytes.length>limit)throw new IOException("Request size limit");}
}
