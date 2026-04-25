import React from 'react';
import {Img} from 'remotion';
import {
  AbsoluteFill,
  Easing,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {tutorialCaptions} from './captions';

const FONT_TITLE = '"Avenir Next", "PingFang TC", "Noto Sans TC", sans-serif';
const FONT_BODY = '"PingFang TC", "Noto Sans TC", sans-serif';
const FONT_MONO = '"IBM Plex Mono", "SF Mono", monospace';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const fadeUp = (frame: number, start: number, duration: number, distance = 28) => {
  const progress = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  return {
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)`,
  };
};

const CaptionBar: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const caption = tutorialCaptions.find((item) => currentMs >= item.startMs && currentMs < item.endMs);

  if (!caption) {
    return null;
  }

  const progress = spring({
    fps,
    frame: frame - Math.floor((caption.startMs / 1000) * fps),
    config: {damping: 18, stiffness: 150},
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 40,
        transform: `translateX(-50%) scale(${interpolate(progress, [0, 1], [0.96, 1])})`,
        maxWidth: 1460,
        padding: '16px 24px',
        borderRadius: 20,
        border: '1px solid rgba(255, 255, 255, 0.18)',
        background: 'rgba(8, 12, 20, 0.82)',
        boxShadow: '0 18px 50px rgba(0, 0, 0, 0.32)',
        color: '#f3f7ff',
        textAlign: 'center',
        fontFamily: FONT_BODY,
        fontSize: 32,
        lineHeight: 1.35,
        backdropFilter: 'blur(12px)',
      }}
    >
      {caption.text}
    </div>
  );
};

const ChapterBadge: React.FC<{label: string; step: string; theme?: 'dark' | 'light'}> = ({
  label,
  step,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 999,
        border: isLight ? '1px solid rgba(117, 96, 62, 0.28)' : '1px solid rgba(135, 204, 255, 0.25)',
        background: isLight ? 'rgba(255, 250, 240, 0.9)' : 'rgba(11, 24, 40, 0.7)',
        color: isLight ? '#425365' : '#cfe6ff',
        fontFamily: FONT_MONO,
        fontSize: 18,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      }}
    >
      <span
        style={{
          padding: '5px 10px',
          borderRadius: 999,
          background: isLight ? '#2f6e6a' : '#2bb7ff',
          color: isLight ? '#f5fbfa' : '#07131f',
          fontWeight: 700,
        }}
      >
        {step}
      </span>
      <span>{label}</span>
    </div>
  );
};

const BrowserShell: React.FC<{
  title: string;
  width: number;
  height: number;
  theme?: 'dark' | 'light';
  children: React.ReactNode;
}> = ({title, width, height, theme = 'dark', children}) => {
  const isLight = theme === 'light';

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 28,
        overflow: 'hidden',
        border: isLight ? '1px solid rgba(142, 126, 97, 0.28)' : '1px solid rgba(141, 193, 255, 0.22)',
        background: isLight
          ? 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(249,244,235,0.95) 100%)'
          : 'linear-gradient(180deg, rgba(16,24,39,0.98) 0%, rgba(9,13,19,0.98) 100%)',
        boxShadow: isLight
          ? '0 26px 70px rgba(78, 60, 28, 0.16)'
          : '0 26px 80px rgba(0, 0, 0, 0.36)',
      }}
    >
      <div
        style={{
          height: 58,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 18px',
          borderBottom: isLight
            ? '1px solid rgba(142, 126, 97, 0.2)'
            : '1px solid rgba(141, 193, 255, 0.14)',
          color: isLight ? '#6d7b8e' : '#c7dcff',
          fontFamily: FONT_MONO,
          fontSize: 17,
          background: isLight ? 'rgba(255, 252, 245, 0.88)' : 'rgba(10, 17, 29, 0.88)',
        }}
      >
        <span style={{color: '#ff7d7d'}}>●</span>
        <span style={{color: '#ffd36e'}}>●</span>
        <span style={{color: '#61e9a5'}}>●</span>
        <span style={{marginLeft: 10}}>{title}</span>
      </div>
      <div style={{position: 'relative', height: height - 58}}>{children}</div>
    </div>
  );
};

const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const iconPop = spring({fps, frame, config: {damping: 14, stiffness: 110}});

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(75% 90% at 8% 8%, rgba(43,183,255,0.22) 0%, rgba(43,183,255,0) 60%), radial-gradient(55% 65% at 92% 12%, rgba(255,198,112,0.16) 0%, rgba(255,198,112,0) 58%), #090d13',
      }}
    >
      <div style={{position: 'absolute', left: 88, top: 88}}>
        <ChapterBadge label="Project Walkthrough" step="00" />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: '0.95fr 1.05fr',
          alignItems: 'center',
          padding: '160px 96px 130px',
          gap: 56,
        }}
      >
        <div>
          <div style={fadeUp(frame, 0, 18)}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 24,
                  display: 'grid',
                  placeItems: 'center',
                  background:
                    'linear-gradient(145deg, rgba(101,208,255,0.24) 0%, rgba(101,208,255,0.04) 100%)',
                  border: '1px solid rgba(174, 231, 255, 0.28)',
                  boxShadow: `0 18px 50px rgba(18, 133, 191, ${0.15 + 0.15 * iconPop})`,
                  transform: `scale(${interpolate(iconPop, [0, 1], [0.92, 1])})`,
                }}
              >
                <Img src={staticFile('icon128.png')} style={{width: 54, height: 54}} />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    color: '#7ebde8',
                    fontSize: 18,
                    letterSpacing: 1.1,
                    textTransform: 'uppercase',
                  }}
                >
                  Chrome Extension
                </div>
                <div
                  style={{
                    color: '#f3f7ff',
                    fontFamily: FONT_TITLE,
                    fontSize: 62,
                    fontWeight: 750,
                    lineHeight: 1.04,
                    marginTop: 8,
                  }}
                >
                  Immersive Translate
                  <br />
                  Notebook
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              ...fadeUp(frame, 8, 18, 24),
              color: '#9db4d8',
              fontSize: 28,
              lineHeight: 1.5,
              maxWidth: 640,
            }}
          >
            把網頁翻譯和影片字幕收進同一個地方，再用 Popup、Notebook 與 AI 分析把例句真正變成可複習資料。
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
            alignContent: 'center',
          }}
        >
          {[
            {title: 'Auto Capture', body: '擷取網頁翻譯與字幕', accent: '#65d0ff'},
            {title: 'Popup Control', body: '搜尋、篩選、收藏、匯出', accent: '#ffc670'},
            {title: 'Notebook Atlas', body: '集中閱讀收藏句子', accent: '#53e7b0'},
            {title: 'AI Grammar', body: 'Gemini / OpenAI 深度解析', accent: '#ff9db8'},
          ].map((card, index) => {
            const style = fadeUp(frame, 12 + index * 5, 16, 24);
            return (
              <div
                key={card.title}
                style={{
                  ...style,
                  padding: '22px 24px',
                  borderRadius: 24,
                  background: 'rgba(16, 24, 39, 0.76)',
                  border: '1px solid rgba(135, 204, 255, 0.16)',
                  boxShadow: '0 18px 36px rgba(0, 0, 0, 0.24)',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: `${card.accent}22`,
                    border: `1px solid ${card.accent}55`,
                    marginBottom: 16,
                  }}
                />
                <div style={{fontSize: 28, color: '#edf5ff', fontFamily: FONT_TITLE, fontWeight: 700}}>
                  {card.title}
                </div>
                <div style={{marginTop: 8, color: '#9db4d8', fontSize: 21, lineHeight: 1.45}}>
                  {card.body}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const InstallScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = spring({fps, frame, config: {damping: 15, stiffness: 120}});

  return (
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(135deg, rgba(12,18,29,1) 0%, rgba(14,23,37,1) 54%, rgba(8,12,20,1) 100%)',
      }}
    >
      <div style={{position: 'absolute', left: 88, top: 88}}>
        <ChapterBadge label="Install Extension" step="01" />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 96,
          top: 188,
          width: 650,
          ...fadeUp(frame, 0, 18),
        }}
      >
        <div style={{fontFamily: FONT_TITLE, fontSize: 68, color: '#eff6ff', fontWeight: 750, lineHeight: 1.06}}>
          先把擴充功能
          <br />
          載進 Chrome
        </div>
        <div style={{marginTop: 18, color: '#9db4d8', fontSize: 26, lineHeight: 1.5}}>
          用 `chrome://extensions` 載入未封裝項目。這一步完成後，Popup 和 Notebook 才會真正接管翻譯內容。
        </div>
      </div>

      <div style={{position: 'absolute', right: 104, top: 150}}>
        <BrowserShell title="chrome://extensions" width={900} height={600}>
          <div
            style={{
              padding: 28,
              height: '100%',
              background:
                'linear-gradient(180deg, rgba(15,24,38,0.96) 0%, rgba(12,19,30,0.98) 100%)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 26,
                ...fadeUp(frame, 6, 16, 20),
              }}
            >
              <div style={{color: '#eff6ff', fontSize: 34, fontFamily: FONT_TITLE, fontWeight: 720}}>
                Extensions
              </div>
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: 999,
                  background: 'rgba(83, 231, 176, 0.14)',
                  border: '1px solid rgba(83, 231, 176, 0.32)',
                  color: '#c5ffe8',
                  fontFamily: FONT_MONO,
                  fontSize: 16,
                }}
              >
                Developer mode ON
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 18,
              }}
            >
              <div
                style={{
                  ...fadeUp(frame, 10, 18, 22),
                  padding: 22,
                  borderRadius: 22,
                  background: 'rgba(18, 37, 58, 0.86)',
                  border: '1px solid rgba(161, 223, 255, 0.18)',
                }}
              >
                <div style={{display: 'flex', gap: 16, alignItems: 'center'}}>
                  <div
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 22,
                      background: 'rgba(101,208,255,0.16)',
                      border: '1px solid rgba(101,208,255,0.28)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Img src={staticFile('icon128.png')} style={{width: 46, height: 46}} />
                  </div>
                  <div>
                    <div style={{fontSize: 26, color: '#edf5ff', fontFamily: FONT_TITLE, fontWeight: 700}}>
                      Immersive Translate Notebook
                    </div>
                    <div style={{fontSize: 18, color: '#8fb0d8', marginTop: 6}}>Manifest V3 · Local install</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  ...fadeUp(frame, 14, 18, 22),
                  padding: 22,
                  borderRadius: 22,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(161, 223, 255, 0.12)',
                }}
              >
                {[
                  '1. 開啟開發人員模式',
                  '2. 選擇載入未封裝項目',
                  '3. 指向專案根目錄',
                ].map((step, index) => (
                  <div
                    key={step}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: index === 0 ? 0 : 14,
                      color: '#dce9ff',
                      fontSize: 21,
                    }}
                  >
                    <span style={{color: '#53e7b0'}}>✓</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 46,
                bottom: 36,
                padding: '14px 22px',
                borderRadius: 16,
                border: '1px solid rgba(174, 231, 255, 0.5)',
                background: 'linear-gradient(100deg, #73ddff 0%, #58ceff 45%, #a6e6ff 100%)',
                color: '#04121d',
                fontSize: 22,
                fontFamily: FONT_TITLE,
                fontWeight: 700,
                transform: `scale(${interpolate(reveal, [0, 1], [0.94, 1])})`,
                boxShadow: '0 16px 34px rgba(31, 173, 238, 0.28)',
              }}
            >
              載入未封裝項目
            </div>
          </div>
        </BrowserShell>
      </div>
    </AbsoluteFill>
  );
};

const CaptureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const cursorX = interpolate(frame, [0, 48, 116, 180, 232], [1110, 1300, 1295, 1380, 1315], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const cursorY = interpolate(frame, [0, 48, 116, 180, 232], [420, 420, 585, 315, 672], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(85% 120% at 0% 0%, rgba(36,121,201,0.34) 0%, rgba(36,121,201,0) 52%), radial-gradient(85% 100% at 100% 100%, rgba(255,198,112,0.16) 0%, rgba(255,198,112,0) 55%), #090d13',
      }}
    >
      <div style={{position: 'absolute', left: 88, top: 88}}>
        <ChapterBadge label="Collect In Popup" step="02" />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 96,
          top: 170,
          width: 560,
          ...fadeUp(frame, 0, 18),
        }}
      >
        <div style={{fontFamily: FONT_TITLE, fontSize: 66, color: '#ebf2ff', fontWeight: 750, lineHeight: 1.05}}>
          翻譯一出現
          <br />
          就會被收進 Popup
        </div>
        <div style={{marginTop: 18, color: '#a8bad8', fontSize: 25, lineHeight: 1.52}}>
          包含網頁翻譯、影片字幕、甚至 Shadow DOM 字幕。你可以立刻搜尋、依來源過濾，再把有價值的句子加進收藏。
        </div>
      </div>

      <div style={{position: 'absolute', left: 690, top: 150}}>
        <BrowserShell title="Popup · Immersive Translate Notebook" width={1140} height={700}>
          <div
            style={{
              padding: 24,
              height: '100%',
              background:
                'radial-gradient(40% 42% at 88% 9%, rgba(79, 191, 255, 0.24) 0%, rgba(79, 191, 255, 0) 75%), radial-gradient(42% 38% at 6% 62%, rgba(255, 198, 112, 0.08) 0%, rgba(255, 198, 112, 0) 84%), linear-gradient(156deg, rgba(8, 16, 28, 0.96) 0%, rgba(8, 14, 22, 0.94) 48%, rgba(9, 13, 19, 0.98) 100%)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                gap: 16,
                paddingBottom: 18,
                borderBottom: '1px solid rgba(129, 166, 214, 0.24)',
                ...fadeUp(frame, 0, 18, 16),
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background:
                    'radial-gradient(140% 140% at 20% 20%, rgba(103, 221, 255, 0.32) 0%, rgba(103, 221, 255, 0.05) 52%, transparent 100%), rgba(17, 31, 49, 0.8)',
                  border: '1px solid rgba(161, 223, 255, 0.32)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <span style={{fontSize: 24}}>📖</span>
              </div>
              <div>
                <div style={{fontSize: 34, color: '#ebf2ff', fontFamily: FONT_TITLE, fontWeight: 740}}>
                  翻譯筆記本
                </div>
                <div style={{fontFamily: FONT_MONO, fontSize: 15, color: '#7485a1', marginTop: 4}}>
                  Immersive Translate Notebook
                </div>
              </div>
              <div
                style={{
                  minWidth: 82,
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: '1px solid rgba(161, 223, 255, 0.38)',
                  background: 'linear-gradient(165deg, rgba(101, 208, 255, 0.2) 0%, rgba(101, 208, 255, 0.04) 100%)',
                  textAlign: 'center',
                }}
              >
                <div style={{fontSize: 28, color: '#d7f3ff', fontFamily: FONT_TITLE, fontWeight: 720}}>128</div>
                <div style={{fontSize: 12, color: '#a8bad8', fontFamily: FONT_MONO, marginTop: 4}}>TOTAL</div>
              </div>
            </div>

            <div style={{display: 'grid', gap: 14, marginTop: 18}}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: 10,
                }}
              >
                {['立即抓取', '匯出', '獨立筆記本', '清除'].map((label, index) => (
                  <div
                    key={label}
                    style={{
                      ...fadeUp(frame, 8 + index * 3, 14, 14),
                      padding: '12px 14px',
                      borderRadius: 12,
                      background:
                        index === 0
                          ? 'linear-gradient(100deg, #73ddff 0%, #58ceff 45%, #a6e6ff 100%)'
                          : index === 3
                            ? 'rgba(255, 111, 111, 0.14)'
                            : 'rgba(20, 34, 55, 0.88)',
                      border:
                        index === 0
                          ? '1px solid rgba(174, 231, 255, 0.6)'
                          : index === 3
                            ? '1px solid rgba(255, 111, 111, 0.28)'
                            : '1px solid rgba(155, 186, 231, 0.2)',
                      color: index === 0 ? '#04121d' : '#ebf2ff',
                      fontFamily: FONT_TITLE,
                      fontSize: 18,
                      fontWeight: 680,
                      textAlign: 'center',
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div
                style={{
                  ...fadeUp(frame, 18, 16),
                  padding: '15px 18px',
                  borderRadius: 14,
                  border: '1px solid rgba(129, 166, 214, 0.24)',
                  background: 'rgba(17, 31, 49, 0.78)',
                  color: '#a8bad8',
                  fontSize: 21,
                }}
              >
                搜尋原文或譯文...
              </div>

              <div style={{display: 'flex', gap: 10}}>
                {['全部', '網頁', '影片', '⭐ 筆記本'].map((chip, index) => (
                  <div
                    key={chip}
                    style={{
                      ...fadeUp(frame, 22 + index * 3, 14, 14),
                      padding: '9px 14px',
                      borderRadius: 999,
                      background: index === 2 ? 'rgba(101,208,255,0.18)' : 'rgba(255,255,255,0.05)',
                      border:
                        index === 2
                          ? '1px solid rgba(101,208,255,0.34)'
                          : '1px solid rgba(129, 166, 214, 0.18)',
                      color: index === 2 ? '#d8f4ff' : '#a8bad8',
                      fontSize: 16,
                      fontFamily: FONT_TITLE,
                    }}
                  >
                    {chip}
                  </div>
                ))}
              </div>

              {[
                {
                  original: 'Shadow DOM subtitles detected.',
                  translation: '已偵測到 Shadow DOM 字幕。',
                  tag: 'video',
                },
                {
                  original: 'Learning by subtitles works.',
                  translation: '用字幕學習真的有效。',
                  tag: 'favorite',
                },
                {
                  original: 'The quick brown fox jumps over the lazy dog.',
                  translation: '那隻敏捷的棕色狐狸跳過了那隻懶狗。',
                  tag: 'web',
                },
              ].map((item, index) => {
                const pop = fadeUp(frame, 28 + index * 5, 16, 18);
                return (
                  <div
                    key={item.original}
                    style={{
                      ...pop,
                      position: 'relative',
                      padding: '18px 20px 18px 18px',
                      borderRadius: 18,
                      border: '1px solid rgba(129, 166, 214, 0.24)',
                      background: 'linear-gradient(180deg, rgba(24, 37, 58, 0.9) 0%, rgba(16, 27, 42, 0.92) 100%)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          background:
                            item.tag === 'favorite'
                              ? 'rgba(255,198,112,0.18)'
                              : item.tag === 'video'
                                ? 'rgba(101,208,255,0.16)'
                                : 'rgba(83,231,176,0.14)',
                          color:
                            item.tag === 'favorite'
                              ? '#ffd99b'
                              : item.tag === 'video'
                                ? '#cceeff'
                                : '#c7ffe9',
                          fontSize: 14,
                          fontFamily: FONT_MONO,
                        }}
                      >
                        {item.tag}
                      </div>
                      <div style={{color: '#ffc670', fontSize: 22}}>{item.tag === 'favorite' ? '★' : '☆'}</div>
                    </div>
                    <div style={{fontSize: 24, color: '#ebf2ff', marginTop: 14, lineHeight: 1.35}}>
                      {item.original}
                    </div>
                    <div style={{fontSize: 23, color: '#8fd6ff', marginTop: 10, lineHeight: 1.35}}>
                      {item.translation}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                position: 'absolute',
                left: cursorX,
                top: cursorY,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#d5f2ff',
                boxShadow: '0 0 0 10px rgba(100, 199, 255, 0.22)',
              }}
            />
          </div>
        </BrowserShell>
      </div>
    </AbsoluteFill>
  );
};

const NotebookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const modalPop = spring({fps, frame: Math.max(frame - 58, 0), config: {damping: 16, stiffness: 120}});

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(60% 70% at 9% 8%, #d7ece9 0%, rgba(215, 236, 233, 0) 62%), radial-gradient(45% 55% at 92% 96%, #f3dec1 0%, rgba(243, 222, 193, 0) 58%), #f2efe8',
      }}
    >
      <div style={{position: 'absolute', left: 88, top: 88}}>
        <ChapterBadge label="Notebook + AI" step="03" theme="light" />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 96,
          top: 170,
          width: 520,
          ...fadeUp(frame, 0, 18),
        }}
      >
        <div style={{fontFamily: FONT_TITLE, fontSize: 64, color: '#1e2a3b', fontWeight: 750, lineHeight: 1.04}}>
          收藏句子之後
          <br />
          再進到 Notebook 深挖
        </div>
        <div style={{marginTop: 18, color: '#4e5d72', fontSize: 25, lineHeight: 1.5}}>
          這裡只顯示已收藏內容。你可以集中複習，順手設定 Gemini 或 OpenAI，直接打開 AI 文法解析視窗。
        </div>
      </div>

      <div style={{position: 'absolute', left: 650, top: 138}}>
        <BrowserShell title="Notebook Atlas · Favorites" width={1180} height={720} theme="light">
          <div
            style={{
              padding: 28,
              height: '100%',
              background:
                'radial-gradient(60% 70% at 9% 8%, rgba(215,236,233,0.46) 0%, rgba(215,236,233,0) 62%), radial-gradient(45% 55% at 92% 96%, rgba(243,222,193,0.38) 0%, rgba(243,222,193,0) 58%), #f2efe8',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 18,
                borderBottom: '1px solid rgba(148, 131, 103, 0.25)',
                ...fadeUp(frame, 0, 18, 16),
              }}
            >
              <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#2f6e6a',
                    border: '1px solid rgba(47, 110, 106, 0.25)',
                    background: 'linear-gradient(145deg, #e8f6f3 0%, #dcece9 100%)',
                  }}
                >
                  ✺
                </div>
                <div>
                  <div style={{fontSize: 33, color: '#1e2a3b', fontFamily: FONT_TITLE, fontWeight: 720}}>
                    Notebook Atlas
                  </div>
                  <div style={{fontSize: 15, color: '#6f7f95', fontFamily: FONT_MONO, marginTop: 4}}>
                    Immersive Translation Favorites
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: 14,
                  background: '#2f6e6a',
                  color: '#f6fcfb',
                  fontFamily: FONT_TITLE,
                  fontSize: 18,
                  fontWeight: 680,
                }}
              >
                AI 模型設定
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 0.8fr',
                gap: 20,
                marginTop: 22,
              }}
            >
              <div style={{display: 'grid', gap: 14}}>
                {[
                  ['Favorite Sentence 1', '在翻譯小視窗中點擊收藏，句子就會集中進入筆記本。'],
                  ['Favorite Sentence 2', '可用搜尋快速回顧之前存下來的例句與譯文。'],
                  ['Favorite Sentence 3', '適合文章閱讀、影片字幕與日常複習整理。'],
                ].map(([title, body], index) => (
                  <div
                    key={title}
                    style={{
                      ...fadeUp(frame, 8 + index * 4, 16, 18),
                      minHeight: 136,
                      padding: '18px 20px',
                      borderRadius: 20,
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(250,245,236,0.94) 100%)',
                      border: '1px solid rgba(168, 155, 131, 0.22)',
                      boxShadow: '0 16px 30px rgba(63, 49, 23, 0.1)',
                    }}
                  >
                    <div style={{fontFamily: FONT_TITLE, fontSize: 27, color: '#1e2a3b', fontWeight: 700}}>
                      {title}
                    </div>
                    <div style={{fontSize: 21, color: '#4e5d72', lineHeight: 1.45, marginTop: 10}}>{body}</div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  ...fadeUp(frame, 18, 16, 18),
                  padding: 18,
                  borderRadius: 20,
                  border: '1px solid rgba(168, 155, 131, 0.28)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 20px 60px rgba(42, 34, 20, 0.12)',
                }}
              >
                <div style={{fontFamily: FONT_TITLE, fontSize: 24, color: '#1e2a3b', fontWeight: 700}}>
                  AI 模型設定
                </div>
                {[
                  '選擇供應商: Gemini / OpenAI',
                  '輸入 API Key 並驗證模型',
                  '指定輸出語言: 繁中 / 英文 / 日文 / 韓文',
                ].map((row) => (
                  <div key={row} style={{marginTop: 14, color: '#4e5d72', fontSize: 19, lineHeight: 1.45}}>
                    {row}
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 18,
                    display: 'inline-flex',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: '#d4ece8',
                    color: '#214f4c',
                    border: '1px solid rgba(47, 110, 106, 0.2)',
                    fontFamily: FONT_TITLE,
                    fontSize: 18,
                  }}
                >
                  儲存設定
                </div>
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                left: 70,
                right: 70,
                bottom: 44,
                padding: '18px 22px',
                borderRadius: 18,
                border: '1px solid rgba(47, 110, 106, 0.22)',
                background: 'rgba(255,255,255,0.92)',
                boxShadow: '0 20px 50px rgba(42, 34, 20, 0.14)',
                opacity: interpolate(modalPop, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(modalPop, [0, 1], [18, 0])}px)`,
              }}
            >
              <div style={{fontFamily: FONT_TITLE, fontSize: 26, color: '#1e2a3b', fontWeight: 700}}>
                AI 深度文法解析
              </div>
              <div style={{fontSize: 20, color: '#4e5d72', marginTop: 10, lineHeight: 1.45}}>
                句型拆解、語氣差異、常見搭配與同義替換，一次整理成可理解的學習筆記。
              </div>
            </div>
          </div>
        </BrowserShell>
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(80% 120% at 10% 0%, rgba(43,183,255,0.18) 0%, rgba(43,183,255,0) 58%), radial-gradient(50% 60% at 90% 100%, rgba(83,231,176,0.12) 0%, rgba(83,231,176,0) 52%), #090d13',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          padding: '150px 160px 180px',
          textAlign: 'center',
        }}
      >
        <div style={fadeUp(frame, 0, 18)}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 16px',
              borderRadius: 999,
              border: '1px solid rgba(83, 231, 176, 0.28)',
              background: 'rgba(83, 231, 176, 0.08)',
              color: '#c5ffe8',
              fontFamily: FONT_MONO,
              fontSize: 17,
            }}
          >
            <span>storage.local</span>
            <span style={{opacity: 0.5}}>•</span>
            <span>local-first</span>
          </div>
          <div
            style={{
              marginTop: 22,
              fontFamily: FONT_TITLE,
              fontSize: 74,
              fontWeight: 760,
              lineHeight: 1.04,
              color: '#eff6ff',
            }}
          >
            開始每天收藏十句
            <br />
            把翻譯真的變成自己的資料庫
          </div>
          <div
            style={{
              marginTop: 20,
              color: '#9db4d8',
              fontSize: 28,
              lineHeight: 1.5,
              maxWidth: 1040,
              marginInline: 'auto',
            }}
          >
            文章、字幕、收藏、AI 解析都在同一條學習鏈上。資料預設只存本機，整理起來也不會被打斷。
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const TutorialVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 18, 816, 839], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  return (
    <AbsoluteFill style={{opacity: fade, fontFamily: FONT_BODY}}>
      <Series>
        <Series.Sequence durationInFrames={84} premountFor={30}>
          <HeroScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={156} premountFor={30}>
          <InstallScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={222} premountFor={30}>
          <CaptureScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={228} premountFor={30}>
          <NotebookScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150} premountFor={20}>
          <OutroScene />
        </Series.Sequence>
      </Series>
      <CaptionBar />
    </AbsoluteFill>
  );
};
