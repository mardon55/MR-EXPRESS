import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { api } from '../api';
import { resolveUrl } from '../utils/resolveUrl';

const RING_UNSEEN = 'bg-gradient-to-tr from-[#00F0FF] via-[#3B82F6] to-[#8B5CF6] p-[2.5px]';
const RING_SEEN   = 'bg-neutral-300/80 p-[2px]';
const IMAGE_DURATION = 5000;

function mediaUrl(url) {
  return resolveUrl(url);
}

// ---------- Bitta hikoya avatari ----------
function StoryItem({ story, onPress }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 press-fluid"
    >
      <div className={`rounded-full ${story.seen ? RING_SEEN : RING_UNSEEN}`}>
        <div className="h-16 w-16 overflow-hidden rounded-full bg-theme-card ring-2 ring-theme-bg">
          {story.media_type === 'video' ? (
            <div className="flex h-full w-full items-center justify-center bg-black/70 text-2xl">🎬</div>
          ) : (
            <img
              src={mediaUrl(story.image_url)}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </div>
      </div>
      <span className="max-w-[72px] truncate text-[11px] font-medium text-theme-muted">
        {story.name}
      </span>
    </button>
  );
}

// ---------- Instagram-style to'liq ekranli player ----------
function StoryPlayer({ stories, startIndex, onClose }) {
  const [idx, setIdx]       = useState(startIndex);
  const [progress, setProg] = useState(0);
  const [paused, setPaused] = useState(false);

  const videoRef    = useRef(null);
  const rafRef      = useRef(null);
  const startRef    = useRef(null);
  const pausedRef   = useRef(0);
  const touchRef    = useRef({ x: 0, y: 0, time: 0 });

  const story   = stories[idx] || stories[0];
  const isVideo = story?.media_type === 'video' ||
    /\.(mp4|webm|mov|avi)(\?|$)/i.test(story?.image_url || '');

  // Tozalash
  const clearTimer = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const goNext = useCallback(() => {
    clearTimer();
    setProg(0);
    pausedRef.current = 0;
    if (idx < stories.length - 1) setIdx(i => i + 1);
    else onClose();
  }, [idx, stories.length, onClose]);

  const goPrev = useCallback(() => {
    clearTimer();
    setProg(0);
    pausedRef.current = 0;
    if (idx > 0) setIdx(i => i - 1);
  }, [idx]);

  // Rasmlar uchun timer
  useEffect(() => {
    if (isVideo) return;
    if (paused) return;
    clearTimer();

    startRef.current = Date.now() - pausedRef.current;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min((elapsed / IMAGE_DURATION) * 100, 100);
      setProg(p);
      if (p < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        goNext();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return clearTimer;
  }, [idx, paused, isVideo, goNext]);

  // Video uchun progress va auto-next
  useEffect(() => {
    if (!isVideo) return;
    const vid = videoRef.current;
    if (!vid) return;

    const onTime  = () => vid.duration ? setProg((vid.currentTime / vid.duration) * 100) : null;
    const onEnded = () => goNext();

    vid.addEventListener('timeupdate', onTime);
    vid.addEventListener('ended', onEnded);
    vid.currentTime = 0;
    vid.play().catch(() => {});
    return () => {
      vid.removeEventListener('timeupdate', onTime);
      vid.removeEventListener('ended', onEnded);
    };
  }, [idx, isVideo, goNext]);

  // Pause/resume
  const handlePauseStart = () => {
    if (isVideo) {
      videoRef.current?.pause();
    } else {
      pausedRef.current = Date.now() - (startRef.current || Date.now());
      setPaused(true);
    }
  };
  const handlePauseEnd = () => {
    if (isVideo) {
      videoRef.current?.play().catch(() => {});
    } else {
      setPaused(false);
    }
  };

  // Touch handlers
  const onTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    handlePauseStart();
  };
  const onTouchEnd = (e) => {
    handlePauseEnd();
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    const dt = Date.now() - touchRef.current.time;

    // Pastga swipe → yopish
    if (dy > 80 && Math.abs(dx) < 60) { onClose(); return; }
    // Tez bosish (tap) → oldinga/orqaga
    if (dt < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      const x = e.changedTouches[0].clientX;
      if (x < window.innerWidth / 3) goPrev(); else goNext();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={handlePauseStart}
      onMouseUp={handlePauseEnd}
    >
      {/* Progress bars */}
      <div className="absolute top-0 inset-x-0 z-30 flex gap-1 px-2 pt-3 safe-area-top">
        {stories.map((_, i) => (
          <div key={i} className="h-[3px] flex-1 rounded-full overflow-hidden bg-white/30">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%',
                transition: i === idx ? 'none' : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-7 inset-x-0 z-30 flex items-center justify-between px-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full overflow-hidden bg-white/20 ring-2 ring-white/50">
            {!isVideo && story?.image_url && (
              <img src={mediaUrl(story.image_url)} alt="" className="h-full w-full object-cover" />
            )}
            {isVideo && <div className="flex h-full w-full items-center justify-center text-base">🎬</div>}
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight drop-shadow">{story?.name}</p>
            <p className="text-white/60 text-[11px]">{isVideo ? 'Video hikoya' : 'Rasm hikoya'}</p>
          </div>
        </div>
        <button
          type="button"
          className="p-2 text-white"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <X className="h-6 w-6 drop-shadow" />
        </button>
      </div>

      {/* Media */}
      <div className="flex-1 flex items-center justify-center">
        {isVideo ? (
          <video
            key={story?.image_url}
            ref={videoRef}
            src={mediaUrl(story?.image_url)}
            className="h-full w-full object-contain"
            playsInline
            muted={false}
            preload="auto"
          />
        ) : (
          <img
            key={story?.image_url}
            src={mediaUrl(story?.image_url)}
            alt=""
            className="h-full w-full object-contain"
          />
        )}
      </div>

      {/* Tap zones (invisible) */}
      <div className="absolute inset-y-0 left-0 w-1/3 z-20" />
      <div className="absolute inset-y-0 right-0 w-1/3 z-20" />

      {/* Nav arrows (optional visual hint) */}
      {idx > 0 && (
        <button
          type="button"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-black/30 text-white"
          onMouseDown={(e) => { e.stopPropagation(); goPrev(); }}
          onTouchEnd={(e) => { e.stopPropagation(); goPrev(); }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {idx < stories.length - 1 && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1 rounded-full bg-black/30 text-white"
          onMouseDown={(e) => { e.stopPropagation(); goNext(); }}
          onTouchEnd={(e) => { e.stopPropagation(); goNext(); }}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

// ---------- Asosiy komponent ----------
export default function StoriesBar() {
  const { user, haptic } = useTelegram();
  const uploadRef = useRef(null);
  const [stories, setStories]       = useState([]);
  const [activeIdx, setActiveIdx]   = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [seenIds, setSeenIds]       = useState(() => new Set());

  const loadStories = useCallback(() => {
    api.getStories()
      .then(data => setStories(Array.isArray(data) ? data : []))
      .catch(() => setStories([]));
  }, []);

  useEffect(() => { loadStories(); }, [loadStories]);

  const openGallery = () => {
    haptic('light');
    uploadRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    haptic('light');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.uploadStory(formData);
      if (res?.ok) {
        haptic('success');
        loadStories();
      }
    } catch (err) {
      console.error('Hikoya yuklash xatosi:', err);
      haptic('error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleStoryPress = (i) => {
    haptic('light');
    setActiveIdx(i);
    setSeenIds(prev => new Set([...prev, stories[i].id]));
  };

  const storiesWithSeen = stories.map(s => ({ ...s, seen: seenIds.has(s.id) }));

  return (
    <section className="mb-3" aria-label="Hikoyalar">
      <input
        ref={uploadRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="flex flex-row gap-3 overflow-x-auto hide-scrollbar pb-0.5 -mx-1 px-1">
        {/* Yuklaish tugmasi */}
        <button
          type="button"
          onClick={openGallery}
          disabled={uploading}
          className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 press-fluid"
        >
          <div className="relative rounded-full bg-neutral-300/70 p-[2px]">
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-theme-card ring-2 ring-theme-bg">
              {uploading ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                </div>
              ) : user?.photo_url ? (
                <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-theme-icon text-lg font-semibold text-theme-accent">+</span>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-theme-bg text-white shadow-md bg-blue-500">
              <Plus className="h-3 w-3" strokeWidth={3} />
            </span>
          </div>
          <span className="max-w-[72px] truncate text-[11px] font-medium text-theme">
            {uploading ? 'Yuklanmoqda' : 'Hikoyam'}
          </span>
        </button>

        {storiesWithSeen.map((story, i) => (
          <StoryItem
            key={story.id}
            story={story}
            onPress={() => handleStoryPress(i)}
          />
        ))}
      </div>

      {activeIdx !== null && (
        <StoryPlayer
          stories={storiesWithSeen}
          startIndex={activeIdx}
          onClose={() => setActiveIdx(null)}
        />
      )}
    </section>
  );
}
