# Galaxy GPL-3.0. Isolated libmpv test: no GUI, audio, network or user profile.
import ctypes as c, os, time
from pathlib import Path
r=Path(r'D:\ai\StremioGalaxy');runtime=r/'dist/win-x64'
os.add_dll_directory(str(runtime));m=c.CDLL(str(runtime/'libmpv-2.dll'))
m.mpv_create.restype=c.c_void_p
m.mpv_initialize.argtypes=[c.c_void_p];m.mpv_initialize.restype=c.c_int
m.mpv_set_option_string.argtypes=[c.c_void_p,c.c_char_p,c.c_char_p];m.mpv_set_option_string.restype=c.c_int
m.mpv_command.argtypes=[c.c_void_p,c.POINTER(c.c_char_p)];m.mpv_command.restype=c.c_int
m.mpv_get_property_string.argtypes=[c.c_void_p,c.c_char_p];m.mpv_get_property_string.restype=c.c_void_p
m.mpv_free.argtypes=[c.c_void_p];m.mpv_terminate_destroy.argtypes=[c.c_void_p]
h=m.mpv_create();assert h
try:
 for k,v in [('config','no'),('vo','null'),('ao','null'),('terminal','no'),('idle','yes'),('keep-open','no'),('scripts',str(r/'utils/stremio/scripts/anime_skip.lua'))]:
  assert m.mpv_set_option_string(h,k.encode(),v.encode())>=0,(k,v)
 assert m.mpv_initialize(h)>=0
 def cmd(*args):
  a=(c.c_char_p*(len(args)+1))(*(x.encode() for x in args),None);assert m.mpv_command(h,a)>=0,args
 def get(k):
  p=m.mpv_get_property_string(h,k.encode())
  if not p:return None
  v=c.string_at(p).decode();m.mpv_free(p);return v
 cmd('loadfile','D:/StremioGalaxyTools/tests/song-markers-test.mkv')
 deadline=time.monotonic()+8
 while get('duration') is None and time.monotonic()<deadline:time.sleep(.05)
 time.sleep(.2);cmd('script-message','button-ui-ready');cmd('script-message','next-episode-ui-ready');time.sleep(.15)
 assert get('keep-open')=='yes',get('keep-open')
 cmd('seek','44','absolute+exact');time.sleep(.2)
 assert get('user-data/anime-next-available') in ('no','false'),'ending followed by after-credits must be blocked'
 cmd('seek','58','absolute+exact');cmd('set','speed','10');cmd('set','pause','no')
 deadline=time.monotonic()+5
 while get('eof-reached')!='yes' and time.monotonic()<deadline:time.sleep(.05)
 assert get('eof-reached')=='yes',get('eof-reached')
 assert get('path') is not None,'keep-open retains the file instead of upstream auto-advance'
 cmd('stop');cmd('script-message','next-episode-ui-release');time.sleep(.1);assert get('keep-open')=='no'
 print('PASS: actual bundled libmpv and Lua, after-credits chapter blocks next, last-frame hold reaches EOF, original keep-open restored; no network/UI/audio')
finally:m.mpv_terminate_destroy(h)
