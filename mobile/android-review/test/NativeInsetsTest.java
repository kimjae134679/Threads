package kr.threads.review;
import java.util.Arrays;
/** Literal pixel fixtures; no Android runtime, device or network. */
public final class NativeInsetsTest {
 private static void expect(String name,int[] actual,int...expected){
  if(!Arrays.equals(actual,expected))throw new AssertionError(name+": "+Arrays.toString(actual));
 }
 public static void main(String[]args){
  int[] base={16,20,16,12};
  expect("portrait gesture bars",WindowInsetPadding.resolve(base,new int[]{0,28,0,24},new int[]{0,0,0,0},new int[]{0,0,0,0}),16,48,16,36);
  expect("cutout and bars overlap, never add",WindowInsetPadding.resolve(base,new int[]{0,28,0,24},new int[]{0,42,0,0},new int[]{0,0,0,0}),16,62,16,36);
  expect("landscape cutout and side navigation",WindowInsetPadding.resolve(base,new int[]{0,0,48,0},new int[]{36,0,0,0},new int[]{0,0,0,0}),52,20,64,12);
  expect("keyboard replaces nav space",WindowInsetPadding.resolve(base,new int[]{0,28,0,24},new int[]{0,0,0,0},new int[]{0,0,0,310}),16,48,16,322);
  expect("redispatch does not accumulate",WindowInsetPadding.resolve(base,new int[]{0,28,0,24},new int[]{0,0,0,0},new int[]{0,0,0,0}),16,48,16,36);
  expect("insets disappear after rotation/keyboard dismissal",WindowInsetPadding.resolve(base,new int[]{0,0,0,0},new int[]{0,0,0,0},new int[]{0,0,0,0}),16,20,16,12);
  expect("zero webview baseline",WindowInsetPadding.resolve(new int[]{0,0,0,0},new int[]{0,32,0,48},new int[]{0,24,0,0},new int[]{0,0,0,0}),0,32,0,48);
  expect("base remains immutable",base,16,20,16,12);
  System.out.println("Native insets JVM PASS (8 fixtures; no Android screen)");
 }
}
