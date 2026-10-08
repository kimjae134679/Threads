package kr.threads.review;
import android.app.Activity;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.os.Build;
import android.view.DisplayCutout;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
/** The outer native root owns physical insets; descendants (including WebView) receive none. */
final class NativeWindowInsets {
 static boolean dark(Activity activity){return (activity.getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES;}
 static int background(Activity activity){return Color.parseColor(dark(activity)?"#181e19":"#f5f4ed");}
 // WebView prefers-color-scheme follows isLightTheme, not only device uiMode.
 static void setTheme(Activity activity){activity.setTheme(dark(activity)?android.R.style.Theme_Material_NoActionBar:android.R.style.Theme_Material_Light_NoActionBar);}
 @SuppressWarnings("deprecation")
 static void apply(Activity activity,View root){
  Window window=activity.getWindow();View decor=window.getDecorView();boolean light=!dark(activity);
  root.setBackgroundColor(background(activity));decor.setBackgroundColor(background(activity));
  window.setStatusBarColor(Color.TRANSPARENT);window.setNavigationBarColor(Color.TRANSPARENT);
  if(Build.VERSION.SDK_INT>=29){window.setStatusBarContrastEnforced(false);window.setNavigationBarContrastEnforced(false);}
  if(Build.VERSION.SDK_INT>=30){
   window.setDecorFitsSystemWindows(false);
   icons(window,light);
  }else{
   int flags=View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
   if(light)flags|=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
   decor.setSystemUiVisibility(flags);
  }
  // Capture once. Repeated keyboard/rotation dispatches must not accumulate padding.
  final int[] base={root.getPaddingLeft(),root.getPaddingTop(),root.getPaddingRight(),root.getPaddingBottom()};
  root.setOnApplyWindowInsetsListener((v,insets)->{
   // The first call can precede attachment. Refresh icon appearance on actual dispatch.
   if(Build.VERSION.SDK_INT>=30)icons(window,light);
   int[] bars,cutout={0,0,0,0},keyboard={0,0,0,0};
   if(Build.VERSION.SDK_INT>=30){
    bars=edges(insets.getInsets(WindowInsets.Type.systemBars()));
    cutout=edges(insets.getInsets(WindowInsets.Type.displayCutout()));
    keyboard=edges(insets.getInsets(WindowInsets.Type.ime()));
   }else{
    bars=new int[]{insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom()};
    if(Build.VERSION.SDK_INT>=28){DisplayCutout display=insets.getDisplayCutout();if(display!=null)cutout=new int[]{display.getSafeInsetLeft(),display.getSafeInsetTop(),display.getSafeInsetRight(),display.getSafeInsetBottom()};}
   }
   int[] padding=WindowInsetPadding.resolve(base,bars,cutout,keyboard);v.setPadding(padding[0],padding[1],padding[2],padding[3]);
   // Prevent WebView CSS env(safe-area-inset-*) from applying the same bars again.
   if(Build.VERSION.SDK_INT>=30)return WindowInsets.CONSUMED;
   WindowInsets consumed=insets.consumeSystemWindowInsets();return Build.VERSION.SDK_INT>=28?consumed.consumeDisplayCutout():consumed;
  });
  root.requestApplyInsets();
 }
 private static void icons(Window window,boolean light){
  WindowInsetsController controller=window.getInsetsController();
  if(controller!=null){int appearance=WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;controller.setSystemBarsAppearance(light?appearance:0,appearance);}
 }
 private static int[] edges(Insets value){return new int[]{value.left,value.top,value.right,value.bottom};}
 private NativeWindowInsets(){}
}
