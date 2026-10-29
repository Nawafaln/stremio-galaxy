local props={duration=1440,['time-pos']=70,seekable=true}
local chapters={{time=0,title='Cold open'},{time=60,title='OP1'},{time=150,title='Story'},{time=1260,title='ED1'},{time=1350,title='After credits'}}
props['chapter-list']=chapters
local events,messages,observed,keys={},{},{},{}
local seeks={}
local noop=function()end
package.preload.mp=function()return {
 create_osd_overlay=function()return {remove=noop,update=noop}end,
 get_property_number=function(k)return props[k]end,get_property_native=function(k,default)if props[k]~=nil then return props[k] end;return default end,
 set_property_native=function(k,v)props[k]=v end,get_osd_size=function()return 1280,720 end,
 commandv=function(cmd,time)assert(cmd=='seek');seeks[#seeks+1]=tonumber(time);props['time-pos']=tonumber(time)end,
 osd_message=noop,add_key_binding=function(k,n,f)keys[k]=f end,add_forced_key_binding=noop,remove_key_binding=noop,
 register_script_message=function(k,f)messages[k]=f end,register_event=function(k,f)events[k]=f end,
 observe_property=function(k,t,f)observed[k]=f end,msg={info=noop}
}end
package.preload['mp.assdraw']=function()return {}end
assert(loadfile('D:/ai/StremioGalaxy/utils/stremio/scripts/anime_skip.lua'))()
props['keep-open']='no';messages['next-episode-ui-ready']();assert(props['keep-open']=='yes');messages['next-episode-ui-release']();assert(props['keep-open']=='no');
messages['button-ui-ready']();events['start-file']();events['file-loaded']()
local ranges=props['user-data/anime-segments'].ranges
assert(#ranges==2 and ranges[1].start==60 and ranges[1].finish==150 and ranges[2].finish==1350)
assert(props['user-data/anime-skip-kind']=='opening')
messages['skip-segment']();assert(seeks[#seeks]==150)
props['time-pos']=1270;observed['time-pos']();assert(props['user-data/anime-skip-kind']=='ending')
messages['skip-ending']();assert(seeks[#seeks]==1350,'must retain the after-credits scene')
keys['Shift+Tab']();assert(seeks[#seeks]==1270)
props['time-pos']=700;observed['time-pos']();local n=#seeks;keys.Tab();assert(#seeks==n)
props['time-pos']=1270;props.seekable=false;messages['skip-ending']();assert(#seeks==n)
-- Regression: actual chapters inspected in the user's Aoashi episode.
props.seekable=true;props.duration=1475.99
props['chapter-list']={{time=0,title='Episode'},{time=69,title='Intro'},{time=158,title='Episode'},{time=1314,title='Credits'},{time=1404,title='Episode'}}
props['time-pos']=1320;observed['chapter-list']()
local actual=props['user-data/anime-segments'].ranges
assert(#actual==2 and actual[2].start==1314 and actual[2].finish==1404)
assert(props['user-data/anime-skip-kind']=='ending')
messages['skip-ending']();assert(seeks[#seeks]==1404,'Credits ends before the final story scene')
assert(props['user-data/anime-next-available']==false,'no next button during credits with later story')
props['time-pos']=1410;observed['time-pos']();assert(props['user-data/anime-next-available']==false,'no next button during after-credits scene')
assert(props['user-data/anime-skip-available']==false)
props.seekable=true;props['chapter-list']={{time=0,title='Chapter 1'},{time=1200,title='Chapter 2'}};observed['chapter-list']();assert(#props['user-data/anime-segments'].ranges==0)
props['chapter-list']={{time=0,title='Episode'},{time=1314,title='Ending'}};props['time-pos']=1320;observed['chapter-list']();assert(props['user-data/anime-next-available']==true,'final ending permits next')
events['end-file']();assert(props['user-data/anime-next-available']==false);assert(props['user-data/anime-skip-available']==false and #props['user-data/anime-segments'].ranges==0)
print('PASS: explicit OP/ED ranges, intro/outro seeks, after-credits retained, undo, generic chapters ignored, nonseekable guard, file cleanup')
