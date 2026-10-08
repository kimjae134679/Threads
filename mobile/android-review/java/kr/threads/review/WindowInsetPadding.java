package kr.threads.review;
/** Insets occupy overlapping screen space; use each edge's maximum, never a sum. */
final class WindowInsetPadding {
 static int[] resolve(int[] base,int[] bars,int[] cutout,int[] keyboard){
  int[] result=new int[4];
  for(int edge=0;edge<4;edge++)result[edge]=base[edge]+Math.max(bars[edge],Math.max(cutout[edge],keyboard[edge]));
  return result;
 }
 private WindowInsetPadding(){}
}
