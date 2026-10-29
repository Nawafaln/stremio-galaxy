-- Personal manual opening skip for Stremio Community / mpv.
-- No network, external processes, file writes, automatic seeks or silence guesses.
local mp = require 'mp'
local assdraw = require 'mp.assdraw'
local overlay = mp.create_osd_overlay('ass-events')
local current_target, box, mouse_bound, undo_pos
local ready = false
local external_ui = false
local published_available
local published_ending
local published_next
local function publish_next(value)
    value=value==true
    if published_next~=value then
        local ok=pcall(mp.set_property_native,'user-data/anime-next-available',value)
        if ok then published_next=value end
    end
end
local file_sequence = 0
local published_video
local function publish(available)
    available = available == true
    if published_available ~= available then
        local ok = pcall(mp.set_property_native, 'user-data/anime-skip-available', available)
        if ok then published_available = available end
    end
end
local function finite(n)
    return type(n) == 'number' and n == n and n > -math.huge and n < math.huge
end
local function publish_ending(value)
    value = value == true
    if published_ending ~= value then
        local ok = pcall(mp.set_property_native, 'user-data/anime-ending-available', value)
        if ok then published_ending = value end
    end
end
local function opening(title)
    if type(title) ~= 'string' then return false end
    local t = title:lower():match('^%s*(.-)%s*$')
    -- Match explicit titles. Never match "Open", "Teaser", or generic Chapter 1.
    if t == 'op' or t:match('^op%d+$') or t:match('^op%s+%d+$') then return true end
    local normalized = t:gsub('[%p_]', ' ')
    for word in normalized:gmatch('%S+') do
        if word == 'opening' or word == 'intro' then return true end
    end
    return t == 'المقدمة' or t == 'مقدمة' or t == 'أغنية البداية' or t == 'اغنية البداية'
end

-- Explicit chapter ranges only: never infer song timings from episode length.
local function ending(title)
    local t = type(title) == 'string' and title:lower():match('^%s*(.-)%s*$') or ''
    return t == 'ed' or t:match('^ed%d+$') or t:match('^ed%s+%d+$')
        or t == 'ending' or t:match('^ending[%s%p]') or t == 'outro'
        or t == 'credits' or t == 'end credits' or t == 'closing credits'
        or t == 'أغنية النهاية' or t == 'اغنية النهاية'
end
local function segments(chapters, duration)
    local ranges = {}
    if type(chapters) ~= 'table' or not finite(duration) or duration <= 0 then return ranges end
    for i, chapter in ipairs(chapters) do
        local a = chapter.time
        local b = chapters[i+1] and chapters[i+1].time or duration
        if finite(a) and finite(b) and a >= 0 and b <= duration and b > a then
            local length = b-a
            local kind
            if opening(chapter.title) and a <= 600 and length >= 15 and length <= 180 and b < duration then kind='opening'
            elseif ending(chapter.title) and a >= duration*0.65 and a >= duration-600 and length >= 15 and length <= 240 then kind='ending' end
            if kind then ranges[#ranges+1]={kind=kind,start=a,finish=b} end
        end
    end
    return ranges
end
local function range_at(pos, ranges)
    if not finite(pos) then return nil end
    for _, range in ipairs(ranges) do
        if pos >= range.start and pos < range.finish-0.2 then return range end
    end
end
local published_segments, published_kind
local function publish_segments(ranges,duration)
    local signature=tostring(duration)
    for _, r in ipairs(ranges) do signature=signature..':'..r.kind..':'..r.start..':'..r.finish end
    if signature~=published_segments then
        local ok=pcall(mp.set_property_native,'user-data/anime-segments',{duration=duration or 0,ranges=ranges})
        if ok then published_segments=signature end
    end
end

local refresh
local function skip(wanted_kind)
    if not ready then return end
    local pos = mp.get_property_number('time-pos')
    local seekable = mp.get_property_native('seekable')
    local range = range_at(pos, segments(mp.get_property_native('chapter-list', {}), mp.get_property_number('duration')))
    local target = range and range.finish
    if type(wanted_kind)=='string' and range and range.kind~=wanted_kind then target=nil end
    if seekable == false or not target then
        mp.osd_message('لا توجد أغنية محددة بفصول في هذا الموضع', 3)
        return
    end
    undo_pos = pos
    mp.commandv('seek', tostring(target), 'absolute+exact')
    mp.osd_message('تم التخطي · Shift+Tab للتراجع', 3)
    refresh()
end

local function undo()
    if not ready or not finite(undo_pos) then return end
    local pos = undo_pos
    undo_pos = nil
    mp.commandv('seek', tostring(pos), 'absolute+exact')
    refresh()
end

local function bind_mouse(hover)
    if hover and not mouse_bound then
        mp.add_forced_key_binding('MBTN_LEFT', 'anime-skip-click', function() skip() end)
        mouse_bound = true
    elseif not hover and mouse_bound then
        mp.remove_key_binding('anime-skip-click')
        mouse_bound = false
    end
end

refresh = function()
    local vp = ready and mp.get_property_native('video-params') or nil
    if type(vp) == 'table' and finite(vp.w) and finite(vp.h) then
        local signature = tostring(file_sequence) .. ':' .. tostring(vp.w) .. ':' .. tostring(vp.h)
        if signature ~= published_video then
            local ok = pcall(mp.set_property_native, 'user-data/anime-loaded-video', {sequence=file_sequence,w=vp.w,h=vp.h})
            if ok then published_video = signature end
        end
    end
    local chapters = mp.get_property_native('chapter-list', {})
    local duration=mp.get_property_number('duration')
    local ranges=ready and segments(chapters,duration) or {}
    publish_segments(ranges,duration)
    local active=ready and range_at(mp.get_property_number('time-pos'),ranges) or nil
    local kind=active and active.kind or ''
    if kind~=published_kind then pcall(mp.set_property_native,'user-data/anime-skip-kind',kind);published_kind=kind end
    publish_ending(kind=='ending')
    -- A later chapter is retained in full, regardless of its title.
    -- Unknown chapters never justify an early next-episode prompt.
    publish_next(active and active.kind=='ending' and finite(duration) and active.finish>=duration-0.05)
    current_target=active and active.finish or nil
    local w, h = mp.get_osd_size()
    box = nil
    publish(current_target ~= nil and mp.get_property_native('seekable') ~= false)
    if external_ui then
        overlay:remove(); bind_mouse(false); return
    end
    if not current_target or not finite(w) or not finite(h) or w < 240 or h < 180 then
        overlay:remove(); bind_mouse(false); return
    end
    local scale = math.max(0.65, math.min(1.5, h / 900))
    local bw, bh, margin = 280 * scale, 62 * scale, 28 * scale
    box = {x1 = w - bw - margin, y1 = h - bh - 130 * scale, x2 = w - margin, y2 = h - 130 * scale}
    local ass = assdraw.ass_new()
    ass:new_event()
    ass:append('{\\an7\\pos(0,0)\\bord0\\shad0\\1c&H202020&\\1a&H18&}')
    ass:draw_start(); ass:rect_cw(box.x1, box.y1, box.x2, box.y2); ass:draw_stop()
    ass:new_event()
    ass:append(string.format('{\\an5\\pos(%.1f,%.1f)\\fs%.1f\\fnSegoe UI\\bord0\\shad0\\1c&HFFFFFF&}%s  ·  Tab', (box.x1+box.x2)/2, (box.y1+box.y2)/2, 21*scale, active and active.kind == 'ending' and 'تخطي النهاية' or 'تخطي المقدمة'))
    overlay.res_x, overlay.res_y, overlay.data, overlay.z = w, h, ass.text, 1000
    overlay:update()
    local m = mp.get_property_native('mouse-pos', {})
    bind_mouse(m.hover == true and finite(m.x) and finite(m.y)
        and m.x >= box.x1 and m.x <= box.x2 and m.y >= box.y1 and m.y <= box.y2)
end

local function clear()
    ready = false; undo_pos = nil; current_target = nil; box = nil
    publish(false)
    published_segments=nil;published_kind=nil
    pcall(mp.set_property_native,'user-data/anime-segments',{duration=0,ranges={}})
    pcall(mp.set_property_native,'user-data/anime-skip-kind','')
    publish_ending(false)
    publish_next(false)
    published_video = nil
    pcall(mp.set_property_native, 'user-data/anime-loaded-video', nil)
    overlay:remove(); bind_mouse(false)
end
mp.add_key_binding('Tab', 'skip', function() skip() end)
mp.add_key_binding('Shift+Tab', 'undo', undo)
mp.register_script_message('skip-opening', function() skip('opening') end)
mp.register_script_message('skip-ending', function() skip('ending') end)
mp.register_script_message('skip-segment', function() skip() end)
-- Keep the current file at its last frame while Galaxy owns next-episode selection.
-- Otherwise the upstream UI immediately auto-advances on mpv-event-ended.
local next_ui, previous_keep_open = false, nil
mp.register_script_message('next-episode-ui-ready', function()
    if not next_ui then
        previous_keep_open=mp.get_property_native('keep-open', 'no')
        next_ui=true
        pcall(mp.set_property_native,'keep-open','yes')
    end
end)
mp.register_script_message('next-episode-ui-release', function()
    if next_ui then
        next_ui=false
        pcall(mp.set_property_native,'keep-open',previous_keep_open or 'no')
    end
end)
mp.register_script_message('button-ui-ready', function()
    external_ui = true; published_available = nil; refresh()
end)
mp.add_key_binding('F8', 'status', function()
    local n = #(mp.get_property_native('chapter-list', {}))
    mp.osd_message('زر التخطي مفعّل · فصول الحلقة: ' .. tostring(n) .. '\nيظهر داخل فصل Intro أو Opening أو Ending أو Credits', 5)
end)
mp.register_event('start-file', function() file_sequence = file_sequence + 1; clear() end)
mp.register_event('file-loaded', function() clear(); ready = true; refresh() end)
mp.register_event('end-file', clear)
mp.register_event('shutdown', clear)
mp.observe_property('time-pos', 'number', refresh)
mp.observe_property('chapter-list', 'native', refresh)
mp.observe_property('osd-dimensions', 'native', refresh)
mp.observe_property('mouse-pos', 'native', refresh)
mp.observe_property('video-params', 'native', refresh)
mp.msg.info('Manual chapter-only anime skip loaded; Tab skip, Shift+Tab undo, F8 status')
