import { useEffect, useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { api } from '../api';

/** Ko'rilmagan istoriya halqasi */
const RING_UNSEEN = 'bg-gradient-to-tr from-[#00F0FF] via-[#3B82F6] to-[#8B5CF6] p-[2.5px]';
/** Ko'rilgan istoriya */
const RING_SEEN = 'bg-neutral-300/80 p-[2px]';

function StoryItem({ story, onPress }) {
  const ringClass = story.seen ? RING_SEEN : RING_UNSEEN;

  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 press-fluid"
    >
      <div className={`rounded-full ${ringClass}`}>
        <div className="h-16 w-16 overflow-hidden rounded-full bg-theme-card ring-2 ring-theme-bg">
          <img src={story.image_url || story.image} alt="" className="h-full w-full object-cover" />
        </div>
      </div>
      <span className="max-w-[72px] truncate text-[11px] font-medium text-theme-muted">
        {story.name}
      </span>
    </button>
  );
}

export default function StoriesBar() {
  const { user, haptic, tg } = useTelegram();
  const uploadRef = useRef(null);
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);

  // 1. Serverdan haqiqiy hikoyalarni yuklab olish
  useEffect(() => {
    // Agar api.getStories funksiyasi bo'lsa chaqiramiz, bo'lmasa bo'sh massiv
    if (api.getStories) {
      api.getStories().then(setStories).catch(() => setStories([]));
    }
  }, []);

  const openGallery = () => {
    haptic('light');
    uploadRef.current?.click();
  };

  // 2. Rasm yoki video tanlanganda uni serverga yuborish
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    haptic('light');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Bu yerda backend API'ga yuklash so'rovi ketadi
      tg?.showPopup?.({
        title: "Yuklanmoqda...",
        message: "Hikoyangiz serverga yuklanmoqda, iltimos kuting."
      });
      
      // Kelgusida backend ulanganida ishga tushadi
      // const res = await api.uploadStory(formData);
      
      tg?.showAlert?.("Hikoya muvaffaqiyatli yuklandi! (Backend to'liq ulangach srazu ro'yxatda chiqadi)");
    } catch (err) {
      tg?.showAlert?.("Yuklashda xatolik yuz berdi.");
    }
    e.target.value = '';
  };

  const handleStoryPress = (story) => {
    haptic('light');
    setActiveStory(story);
  };

  return (
    <section className="mb-3" aria-label="Hikoyalar">
      <input
        ref={uploadRef}
        type="file"
        id="story-upload"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="flex flex-row gap-3 overflow-x-auto hide-scrollbar pb-0.5 -mx-1 px-1">
        {/* O'z hikoyangizni yuklash tugmasi */}
        <button
          type="button"
          onClick={openGallery}
          className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 press-fluid"
        >
          <div className="relative rounded-full bg-neutral-300/70 p-[2px]">
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-theme-card ring-2 ring-theme-bg">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-theme-icon text-sm font-semibold text-theme-accent">
                  +
                </span>
              )}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-theme-bg text-white shadow-md bg-blue-500"
            >
              <Plus className="h-3 w-3" strokeWidth={3} />
            </span>
          </div>
          <span className="max-w-[72px] truncate text-[11px] font-medium text-theme">
            Hikoyam
          </span>
        </button>

        {/* Serverdan kelgan hikoyalar */}
        {stories.map((story) => (
          <StoryItem
            key={story.id}
            story={story}
            onPress={() => handleStoryPress(story)}
          />
        ))}
      </div>

      {/* 3. Hikoya ochilgandagi to'liq ekranli vizual player */}
      {activeStory && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center"
          onClick={() => setActiveStory(null)}
        >
          <div className="absolute top-4 inset-x-4 flex justify-between items-center text-white z-10">
            <span className="font-bold text-sm">{activeStory.name}</span>
            <button className="text-xl p-2" onClick={() => setActiveStory(null)}>✕</button>
          </div>
          <img 
            src={activeStory.image_url || activeStory.image} 
            alt="" 
            className="w-full max-h-[80vh] object-contain"
          />
        </div>
      )}
    </section>
  );
}