const shapes={
heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
comment:'<path d="M21 11.5a9 9 0 1 1-4.1-7.6 8.9 8.9 0 0 1 4.1 7.6Z"/><path d="m18 18 3 3v-8"/>',
share:'<path d="m22 2-8 20-4-9L1 9 22 2Z"/><path d="m10 13 12-11"/>',
save:'<path d="M5 3h14v19l-7-5-7 5V3Z"/>',
repost:'<path d="m18 3 3 3-3 3M3 11V8a2 2 0 0 1 2-2h16M6 21l-3-3 3-3M21 13v3a2 2 0 0 1-2 2H3"/>',
person:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>'
};
export const icon=(name,extra='')=>'<svg class="svg-icon '+extra+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+shapes[name]+'</svg>';
