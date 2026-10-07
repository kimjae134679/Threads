package kr.threads.review;
import android.content.Context;
import android.security.keystore.*;
import android.util.AtomicFile;
import org.json.JSONObject;
import java.io.*;import java.security.*;import java.util.Arrays;
import javax.crypto.*;import javax.crypto.spec.GCMParameterSpec;
/** AES/GCM encrypted app-private no-backup file. Lazy key creation ONLY on approved save. */
public final class AndroidTokenVault implements DeviceFlowController.Vault {
 private static final String ALIAS="threads-review-device-user-v1";
 private final AtomicFile file;private final DeviceFlowController.Consent consent;
 public AndroidTokenVault(Context c,DeviceFlowController.Consent allowed){file=new AtomicFile(new File(c.getNoBackupFilesDir(),"github-user-session.enc"));consent=allowed;}
 public boolean hasSaved(){return file.getBaseFile().exists();}
 private void allowed()throws Exception{if(!consent.approved())throw new DeviceFlowController.AuthException("Protected credentials not approved");}
 private KeyStore keyStore()throws Exception{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);return ks;}
 private SecretKey key(boolean create)throws Exception{
  KeyStore ks=keyStore();if(ks.containsAlias(ALIAS))return (SecretKey)ks.getKey(ALIAS,null);
  if(!create)throw new GeneralSecurityException("Missing protected key; login again");
  allowed();KeyGenerator kg=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  kg.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build());return kg.generateKey();
 }
 public synchronized void save(DeviceFlowController.Tokens t)throws Exception{
  allowed();if(t==null||t.access.isEmpty()||t.refresh.isEmpty())throw new GeneralSecurityException("Invalid protected session");
  byte[] plain=new JSONObject().put("access",t.access).put("refresh",t.refresh).put("expiresAt",t.expiresAt).put("refreshExpiresAt",t.refreshExpiresAt).toString().getBytes("UTF-8");
  FileOutputStream stream=null;try{
   Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key(true));cipher.updateAAD(ConnectionConfig.profile().getBytes("UTF-8"));byte[] encrypted=cipher.doFinal(plain),iv=cipher.getIV();
   stream=file.startWrite();DataOutputStream out=new DataOutputStream(stream);out.writeInt(1);out.writeInt(iv.length);out.write(iv);out.writeInt(encrypted.length);out.write(encrypted);out.flush();file.finishWrite(stream);stream=null;
  }finally{Arrays.fill(plain,(byte)0);if(stream!=null)file.failWrite(stream);}
 }
 public synchronized DeviceFlowController.Tokens load()throws Exception{
  allowed();if(!hasSaved())return null;byte[] plain=null;
  try(DataInputStream in=new DataInputStream(file.openRead())){
   if(in.readInt()!=1)throw new GeneralSecurityException("Invalid vault format");int n=in.readInt();if(n!=12)throw new GeneralSecurityException("Invalid vault IV");byte[] iv=new byte[n];in.readFully(iv);n=in.readInt();if(n<16||n>16384)throw new GeneralSecurityException("Invalid vault length");byte[] encrypted=new byte[n];in.readFully(encrypted);if(in.read()!=-1)throw new GeneralSecurityException("Invalid vault tail");
   Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(false),new GCMParameterSpec(128,iv));cipher.updateAAD(ConnectionConfig.profile().getBytes("UTF-8"));plain=cipher.doFinal(encrypted);JSONObject j=new JSONObject(new String(plain,"UTF-8"));return new DeviceFlowController.Tokens(j.getString("access"),j.getString("refresh"),j.getLong("expiresAt"),j.getLong("refreshExpiresAt"));
  }finally{if(plain!=null)Arrays.fill(plain,(byte)0);}
 }
 public synchronized void clear()throws Exception{file.delete();KeyStore ks=keyStore();if(ks.containsAlias(ALIAS))ks.deleteEntry(ALIAS);}
}
