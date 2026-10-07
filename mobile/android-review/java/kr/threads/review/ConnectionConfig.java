package kr.threads.review;
/** Public configuration only. Parent must obtain exact dedicated-repo/app approval.
 * No real configuration, credential or approval is present in this build. */
public final class ConnectionConfig {
 public static final boolean ACTIVATION_APPROVED=false,DEDICATED_REPOSITORY_APPROVED=false;
 public static final String CLIENT_ID="",OWNER="",REPO="",BRANCH="mobile-review/data";
 public static final long REPOSITORY_ID=0;
 public static boolean approved(){return ACTIVATION_APPROVED&&DEDICATED_REPOSITORY_APPROVED&&CLIENT_ID.matches("[A-Za-z0-9_.-]+")&&OWNER.matches("[A-Za-z0-9-]+")&&REPO.matches("[A-Za-z0-9_.-]+")&&REPOSITORY_ID>0;}
 public static String prefix(){return "/repos/"+OWNER+"/"+REPO;}
 public static String profile(){return CLIENT_ID+":"+OWNER+"/"+REPO+":"+REPOSITORY_ID;}
 private ConnectionConfig(){}
}
