// Display boundary only. Never apply this to article paragraphs, URLs, IDs, or version inputs.
const SOURCE_PREFIX=/^\s*(?:\[\s*(?:네이트\s*판|판|블라인드|natepann|blind)\s*\]|\(\s*(?:네이트\s*판|판|블라인드|natepann|blind)\s*\))\s*/i;
export function cleanDisplayTitle(value){let text=String(value??'');while(SOURCE_PREFIX.test(text))text=text.replace(SOURCE_PREFIX,'');return text.trim();}
export function cleanCaptionFirstLine(value){
 const text=String(value??''),at=text.indexOf('\n'),line=at<0?text:text.slice(0,at),cr=line.endsWith('\r')?'\r':'',first=cr?line.slice(0,-1):line,rest=at<0?'':text.slice(at);
 const outer=/^\s*\[\s+([\s\S]*?)\s+\]\s*$/.exec(first),candidate=outer?outer[1]:first,cleaned=cleanDisplayTitle(candidate);
 // Exact ordinary first lines and all remaining bytes are retained.
 if(!SOURCE_PREFIX.test(candidate))return text;
 const existingTitle=/^\[\s+([\s\S]*?)\s+\]$/.exec(cleaned),title=existingTitle?existingTitle[1]:cleaned;
 return (title?'[ '+title+' ]':'')+cr+rest;
}
