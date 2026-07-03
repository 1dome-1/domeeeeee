<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Crystal Hunter RPG — Ultimate Stable Edition</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="game-shell">
    <header class="topbar">
      <div class="logo-area">
        <img src="https://res.cloudinary.com/dsucg33fv/image/upload/v1782709347/logo_i8827v.png" alt="Crystal Hunter Logo" class="game-logo" onerror="this.style.display='none'" />
        <div>
          <p class="eyebrow">MDA Framework Integrated Build</p>
          <h1>Crystal Hunter: The Final Gate</h1>
        </div>
      </div>
      <div class="status-pill">v3.1 Production Ready</div>
    </header>

    <canvas id="game" width="960" height="600"></canvas>
    
    <div class="fullscreen-control">
      <button id="btn-fullscreen">🖥️ เล่นแบบเต็มจอ (Toggle Fullscreen)</button>
    </div>
    
    <div class="hint">
      <strong>[วิธีควบคุม]:</strong> WASD / ปุ่มลูกศร = เคลื่อนที่ • คลิกซ้าย = โจมตีปกติ • Q / คลิกขวา = ใช้สกิล • Shift = แดชความเร็วสูง • P = เปิด/ปิดหน้าต่างสถานะ & ฮีลระบบ • B = เปิด/ปิดหน้าต่างร้านค้าสกินแบบกริด
    </div>

    <section class="vibe-panel" aria-label="Game Design Note">
      <h2>Game Design Analysis (MDA Framework)</h2>
      <div class="vibe-grid">
        <article>
          <h3>Challenge (ความท้าทาย)</h3>
          <p>เข้าใจง่ายแต่เล่นยาก ศัตรูธรรมดาและบอสใหญ่จะทวีความโหดขึ้นตามชั้นมิติ ต้องอาศัยจังหวะการแดชหลบและการบริหารจัดการ Stamina</p>
        </article>
        <article>
          <h3>Exploration & Reward</h3>
          <p>สะสมผลึก Shards เพื่อเพิ่มพลังและทองคำ สุ่มรับโบนัสทองคำเพิ่ม 5-15 ทองเมื่อกำจัดศัตรูสำเร็จ มอบรางวัลที่คุ้มค่าทุกการกระทำ</p>
        </article>
        <article>
          <h3>Expression (การแสดงออก)</h3>
          <p>ระบบร้านค้าสกินมิติ (Chroma Shop) กดปุ่ม B เพื่อเปิดอินเตอร์เฟสกริดที่จัดระเบียบเรียบร้อย สื่อสารข้อมูลชัดเจนด้วย UI/UX ที่สะอาดตา</p>
        </article>
      </div>
    </section>
  </div>

  <script src="game.js"></script>
</body>
</html>
