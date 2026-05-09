import { useEffect } from 'react';

const TikTokPlayer = ({ videoUrl }) => {
  useEffect(() => {
    // Tải script của TikTok để render video
    const script = document.createElement('script');
    script.src = "https://www.tiktok.com/embed.js";
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script); // Dọn dẹp khi component unmount
    };
  }, [videoUrl]);

  // Lấy ID video từ URL TikTok để làm key định danh (tùy chọn)
  const videoId = videoUrl.split('/').pop();

  return (
    <div style={{ maxWidth: '325px', margin: '0 auto' }}>
      <blockquote 
        className="tiktok-embed" 
        cite={videoUrl} 
        data-video-id={videoId} 
        style={{ maxWidth: '605px', minWidth: '325px' }}
      >
        <section>
          <a target="_blank" rel="noreferrer" href={videoUrl}>Đang tải video TikTok...</a>
        </section>
      </blockquote>
    </div>
  );
};
export default TikTokPlayer;