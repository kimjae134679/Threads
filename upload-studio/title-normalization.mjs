// titleInfo copied exactly from the producer's shared policy at f85b072221fdf5f3ab1e5d92c313bb9157547c77.
// Apply at display/title-input boundaries only; original source and all body bytes remain unchanged.
export function titleInfo(original) {
    const originalTitle=String(original??''),sourceLabels=[];
    const label='(?:네이트\\s*판|판|더쿠|인스티즈|블라인드|루리웹|인벤|디시(?:인사이드)?|에펨코리아|펨코|뽐뿌|보배드림|클리앙|개드립|blind|pann|theqoo|instiz|inven|ruliweb|dcinside|fmkorea)';
    const category='(?:장문|초?스압|사진|펌|끌올|후기\\s*추가|추가\\s*후기|후기|사이다)';
    const prefix=new RegExp('^\\s*(?:\\[\\s*(?:'+label+'|'+category+')\\s*\\]|\\(\\s*(?:'+label+'|'+category+')\\s*\\))\\s*(?:[+|:：·]\\s*)?','iu');
    const suffix=new RegExp('\\s*(?:\\[\\s*'+label+'\\s*\\]|\\(\\s*'+label+'\\s*\\))\\s*$','iu');
    let displayTitle=originalTitle,match;
    while((match=displayTitle.match(prefix)||displayTitle.match(/^\s*(?:\{\s*)?판\s*\}\s*/u))){sourceLabels.push(match[0].trim());displayTitle=displayTitle.slice(match[0].length);}
    while((match=displayTitle.match(suffix)||displayTitle.match(/\s+(?:\{\s*)?판\s*\}\s*$/u))){sourceLabels.push(match[0].trim());displayTitle=displayTitle.slice(0,-match[0].length);}
    return {originalTitle,displayTitle:displayTitle.trim(),sourceLabels};
  }
export function cleanDisplayTitle(value){return titleInfo(value).displayTitle;}
export function cleanCaptionFirstLine(value){
 const text=String(value??''),at=text.indexOf('\n'),line=at<0?text:text.slice(0,at),cr=line.endsWith('\r')?'\r':'',first=cr?line.slice(0,-1):line,rest=at<0?'':text.slice(at);
 const outer=/^\s*\[\s+([\s\S]*?)\s+\]\s*$/.exec(first),candidate=outer?outer[1]:first,info=titleInfo(candidate);
 if(!info.sourceLabels.length)return text;
 const existingTitle=/^\[\s+([\s\S]*?)\s+\]$/.exec(info.displayTitle),title=existingTitle?existingTitle[1]:info.displayTitle;
 return (title?'[ '+title+' ]':'')+cr+rest;
}
