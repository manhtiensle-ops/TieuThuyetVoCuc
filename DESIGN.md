# DESIGN.md — Novel Platform Frontend Design System

## Visual World

**Tên thế giới thị giác:** _Academia Arcana_ — Thư viện bí ẩn thời cổ đại, nơi những trang sách sống động và ký tự Hán Việt trôi nổi trong không gian 3D. Cảm giác: học thuật + ma thuật + kỳ ảo phương Đông.

**Triết lý thiết kế:**
- **Read mode** chiếm ưu thế: Giao diện đọc truyện là _không gian_, không phải ứng dụng.
- Tất cả UI chrome (nav, controls) **co rút** khi người dùng đọc. Chỉ còn văn bản và nền.
- Hoạt họa 3D xuất hiện ở **landing, transitions, profile** — không bao giờ lúc đọc.
- Mọi animation phục vụ ngữ nghĩa, không phải trang trí.

---

## Typography System

### Font Stack (Triple Serif)

```css
/* Tiêu đề lớn, tên truyện, hero text */
--font-heading: 'Cormorant Garamond', Georgia, serif;

/* Thân bài đọc chương — tối ưu thị giác dài */
--font-body: 'Crimson Pro', 'Libre Baskerville', Georgia, serif;

/* Overline, nhãn chương, số trang — ALL CAPS */
--font-display: 'Cinzel', 'Trajan Pro', serif;

/* UI labels, metadata, stats */
--font-ui: 'Inter', system-ui, sans-serif;
```

### Type Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `--text-hero` | 72px | 400 | Landing hero |
| `--text-h1` | 48px | 500 | Tên truyện |
| `--text-h2` | 36px | 500 | Tên chương |
| `--text-h3` | 24px | 600 | Section heads |
| `--text-reading` | 20px | 400 | Body text khi đọc |
| `--text-body` | 16px | 400 | UI body |
| `--text-label` | 12px | 600 | Cinzel labels |
| `--text-caption` | 11px | 400 | Meta, timestamps |

### Reading Typography Rules
- Line length: **62–68 ch** (tuyệt đối không vượt 75ch)
- Line height đọc: **1.85** (thoáng hơn văn xuôi thường)
- Letter spacing Cinzel labels: **+2px** (0.125em)
- Drop cap chương đầu: **4rem Cinzel**, màu Brass `#C9A84C`
- `hyphens: auto` + `text-align: justify` cho màn rộng

---

## Color Tokens

### Base Palette — Dark Mode (Default)

```css
:root[data-theme="dark"] {
  /* Nền trang đọc */
  --bg-void:        #08090D;   /* OLED black tuyệt đối */
  --bg-deep:        #0D0F1A;   /* Nền app chính */
  --bg-surface:     #12162A;   /* Card, sidebar */
  --bg-raised:      #1A1F3A;   /* Hover, elevated */

  /* Typography */
  --text-primary:   #E8E0D0;   /* Warm off-white — không chói */
  --text-secondary: #9A8F7E;   /* Muted warm */
  --text-muted:     #5C5347;   /* Placeholder */

  /* Accent — Brass & Amber (Cổ điển Đông phương) */
  --accent-gold:    #C9A84C;   /* Primary brand */
  --accent-amber:   #D97706;   /* CTA, links */
  --accent-bronze:  #92400E;   /* Hover states */

  /* Borders */
  --border-subtle:  rgba(201,168,76,0.12);
  --border-medium:  rgba(201,168,76,0.25);
  --border-strong:  rgba(201,168,76,0.45);

  /* 3D Scene */
  --glow-primary:   rgba(201,168,76,0.4);
  --glow-ambient:   rgba(139,90,43,0.2);
  --fog-color:      #0D0F1A;
}
```

### Sepia Mode (Đọc ban ngày)

```css
:root[data-theme="sepia"] {
  --bg-void:        #F5EDD8;
  --bg-deep:        #EDE0C4;
  --bg-surface:     #E5D5B0;
  --text-primary:   #2C1810;
  --text-secondary: #6B4C3B;
  --accent-gold:    #8B4513;
  --border-subtle:  rgba(139,69,19,0.15);
}
```

### OLED Night Mode (Đọc đêm OLED)

```css
:root[data-theme="oled"] {
  --bg-void:    #000000;  /* Tắt pixel OLED */
  --bg-deep:    #050508;
  --bg-surface: #0A0A12;
  --text-primary: #D4C5A9;  /* Giảm độ chói */
}
```

---

## 3D Scene Architecture (Three.js)

### Scene 1: Landing Hero — "Floating Tomes"

```
Camera: Perspective, FOV 60°, near 0.1, far 100
Lights: AmbientLight(0x1a0f05, 0.6) + PointLight(0xC9A84C, 2.0) @ (0,3,2)

Objects:
  - 12–15 cuốn sách 3D (BoxGeometry, custom leather texture)
  - Mỗi cuốn floating animation: sin(time + offset) * 0.3 trên trục Y
  - Random rotation drift: ±5° theo X và Z
  - Particle system: 200 glowing dots (ký tự Hán Việt textures)
  - Fog: THREE.FogExp2(0x0D0F1A, 0.035)

Interactions:
  - Mouse parallax: camera.position lerp đến mouse * 0.3
  - Hover sách: scale lerp(1.15), emissive intensity tăng
  - Click sách: sách "mở ra" → page flip animation → route transition
```

### Scene 2: Book Cover Display — "Gallery 3D"

```
Layout: Infinite carousel 3D dạng conic/arc
Each book:
  - PlaneGeometry(1.4, 2.0) + cover texture
  - Depth illusion: perspectiveCamera + varying Z positions
  - Hover: rotate Y +15°, translateZ +0.5, glow rim light
  - Active: center stage, larger, shadow plane beneath

Shader: Custom rim-light glsl để highlight viền bìa sách
```

### Scene 3: Chapter Reading — KHÔNG CÓ 3D

```
Zero motion khi đang đọc. UI chrome ẩn hoàn toàn.
Chỉ: cursor thay đổi thành feather quill SVG.
Progress bar dạng mực thấm vào giấy (CSS clip-path).
```

### Scene 4: User Profile — "Inkwell Portal"

```
Background: Particle vortex (ký tự rơi theo xoáy tròn)
Avatar: Nổi 3D, bokeh shadow bên dưới
Stats: Số liệu xuất hiện với counting animation (GSAP)
Bookshelf: 3D bookshelf với các truyện đã đọc như object thật
```

---

## Animation System

### Motion Principles (Impeccable-compliant)

1. **Một khoảnh khắc chủ đạo** mỗi trang — không scatter hiệu ứng.
2. Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (expo ease-out) — default.
3. Duration: **280ms** cho micro-interactions, **600ms** cho page transitions.
4. Animate **transform + opacity** trước. Blur, clip-path, backdrop-filter khi cần thiết.
5. Bắt buộc `prefers-reduced-motion: reduce` → tắt toàn bộ animation, giữ transition instant.

### GSAP ScrollTrigger — Reading View

```javascript
// Tên chương xuất hiện khi scroll đến
gsap.from('.chapter-title', {
  scrollTrigger: { trigger: '.chapter-title', start: 'top 80%' },
  opacity: 0,
  y: 40,
  duration: 0.8,
  ease: 'expo.out'
});

// Progress ink effect
gsap.to('.reading-progress-ink', {
  scrollTrigger: {
    trigger: 'body',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.3
  },
  scaleX: 1,
  transformOrigin: 'left center'
});
```

### Framer Motion — Page Transitions

```tsx
// Route transition: cuộn trang giống lật sách
const pageVariants = {
  enter: { opacity: 0, rotateY: -8, transformPerspective: 800 },
  center: { opacity: 1, rotateY: 0 },
  exit: { opacity: 0, rotateY: 8 }
};

const pageTransition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
  duration: 0.5
};
```

### Micro-interactions

```css
/* Button press — tactile feel */
.btn-primary {
  transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 150ms ease;
}
.btn-primary:active {
  transform: scale(0.96) translateY(1px);
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
}

/* Link hover — underline mực thấm */
.novel-link {
  background-image: linear-gradient(currentColor, currentColor);
  background-size: 0% 1px;
  background-position: 0 100%;
  background-repeat: no-repeat;
  transition: background-size 280ms cubic-bezier(0.16, 1, 0.3, 1);
}
.novel-link:hover { background-size: 100% 1px; }
```

---

## Component Library

### ReadingView — Màn hình đọc chương

```
Layout:
  max-width: 720px, margin: 0 auto
  padding: 3rem 2rem (mobile: 1.5rem 1.25rem)

Reading controls (collapse khi scroll xuống):
  - Font size slider (16px–24px)
  - Theme switcher (Dark / Sepia / OLED)
  - Font selector (Serif / Sans)
  - Line height (1.6 / 1.85 / 2.1)

Chapter navigation:
  - Swipe gesture (mobile): prev/next chapter
  - Keyboard: ← → arrow keys
  - Bottom bar: chương trước / chương sau, TOC

Browser surfaces (Impeccable requirement):
  - ::selection { background: rgba(201,168,76,0.25); color: inherit; }
  - scrollbar-width: thin; scrollbar-color: #C9A84C #12162A;
  - caret-color: #C9A84C;
  - :focus-visible { outline: 2px solid #C9A84C; outline-offset: 3px; }
```

### NovelCard — Thẻ truyện (Homepage / Search)

```
NOT a generic card. Thiết kế như bìa sách thật:
  - Tỉ lệ: 2:3 (portrait book ratio)
  - 3D tilt effect: CSS perspective(800px) rotateX/Y theo mouse
  - Spine shadow: linear-gradient bên trái tạo chiều sâu gáy sách
  - Hover: translateZ(20px), rim light từ trên
  - Badge trạng thái (Đang ra / Hoàn / Tạm ngưng): ribbon góc trên
```

### CommentThread — Bình luận

```
Layout: Indented thread, max 3 levels
Avatar: Circle clip, gradient border theo rank
Timestamp: Relative (vd: "3 giờ trước") hover → absolute
Quote reply: Blockquote với border-left 2px #C9A84C
Markdown support: Bold, italic, spoiler blur
Upvote animation: heart fill + count bounce
```

### UserProfile Page

```
Sections:
  1. Hero: 3D particle portal background, large avatar, display name
  2. Stats strip: Số truyện đọc, số chương, số bình luận, ngày tham gia
  3. Bookshelf 3D: Truyện yêu thích (Three.js shelf)
  4. Reading history: Timeline dạng scroll ngang
  5. Badges / Achievements: Icon-based, tooltip reveal
```

---

## Responsive Breakpoints

```css
--breakpoint-sm:  640px;   /* Mobile landscape */
--breakpoint-md:  768px;   /* Tablet */
--breakpoint-lg:  1024px;  /* Desktop */
--breakpoint-xl:  1280px;  /* Wide desktop */
--breakpoint-2xl: 1536px;  /* Ultra wide */

/* Reading view: max-width cứng */
.reading-container {
  max-width: min(720px, 90vw);
}
```

---

## Accessibility (a11y)

- Contrast ratio: tất cả text ≥ **4.5:1** (body), ≥ **3:1** (large)
- Focus ring: luôn visible, không bao giờ `outline: none` không có thay thế
- ARIA labels: Nav, Reading progress, Comment count
- Skip to content: link ẩn ở đầu DOM, hiện khi focus
- Screen reader: announcer cho chapter load, comment submit
- Keyboard navigation: Tab order logic, Esc đóng modal
- `prefers-reduced-motion`: tắt toàn bộ animation + 3D scene → static

---

## Anti-patterns (CẤMTUYỆT ĐỐI)

Theo Impeccable craft-floor:
- ❌ Card lồng nhau (nested cards)
- ❌ Gradient text (cho tiêu đề)
- ❌ Glass/blur dùng để trang trí không có mục đích
- ❌ Section number 01/02/03 không có ý nghĩa
- ❌ Emoji thay icon — Dùng Lucide / Phosphor SVG icons
- ❌ Hard offset shadow (4px 4px 0) ngoài context neobrutalist
- ❌ Kicker/eyebrow label trên tiêu đề
- ❌ Motion scatter (mỗi section một hiệu ứng khác nhau)
- ❌ 3D animation trong reading view
- ❌ Thay đổi font chữ khi đọc (layout shift gây mất trang)
