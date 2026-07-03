const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- โหลดระบบ Image Assets จากโครงสร้าง Path ที่กำหนดมาเจาะจง ---
const images = {
  player: new Image(),
  potion: new Image(),
  enemy: new Image(),
  boss: new Image(),
  ground: new Image()
};

images.player.src = "https://res.cloudinary.com/dsucg33fv/image/upload/v1782709479/player_umd922.png";
images.potion.src = "https://res.cloudinary.com/dsucg33fv/image/upload/v1782709447/potion_ladf9n.png";
images.enemy.src = "https://res.cloudinary.com/dsucg33fv/image/upload/v1782709477/enemy_jykcgz.png";
images.boss.src = "https://res.cloudinary.com/dsucg33fv/image/upload/v1782709455/boss_e8jti1.png";
images.ground.src = "https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png";

// สกินเสริมสำหรับการ Expression
const SKINS = {
  default: { name: "คลาสสิกอาร์ค", color: "#38bdf8", desc: "ชุดเริ่มต้นของนักล่า" },
  emerald: { name: "เอเมอรัลด์นาโน", color: "#34d399", desc: "ชุดซับพลังงานธรรมชาติ" },
  ruby: { name: "รูบี้คอร์ไรเอท", color: "#f87171", desc: "ชุดเร่งพลังงานทำลายล้าง" }
};

// ข้อมูลสถานะแกนเกมหลัก (ปรับระบบสมดุลดาเมจ / ค่า Stamina / และการทำงานต่างๆ)
let state = {
  player: {
    x: 480, y: 450, size: 36,
    hp: 100, maxHp: 100,
    mana: 60, maxMana: 60,
    stamina: 100, maxStamina: 100,
    gold: 200, score: 0, speed: 4.8, level: 1, exp: 0, nextLevelExp: 120,
    baseDamage: 25, // ค่าแรงดาเมจโจมตีปกติเริ่มต้นที่เสถียร
    skillDamage: 60, // ดาเมจสกิล
    currentSkin: "default"
  },
  projectiles: [],
  enemies: [],
  particles: [],
  crystals: [],
  dungeonLevel: 1,
  bossSpawned: false,
  gameCompleted: false, // เปิดใช้งานสำหรับเช็คฉากจบเกมสำเร็จ
  showShop: false,
  showUpgradeMenu: false,
  dashCooldown: 0
};

const keyState = {};
const mouse = { x: 0, y: 0 };
let lastAttackTime = 0;

// สร้างมอนสเตอร์ตามระดับความท้าทาย
function spawnEnemy() {
  // หากคะแนนเกิน 3,000 และอยู่ด่าน 5 จะเรียกบอสใหญ่ตัวสุดท้ายออกมาเพื่อมุ่งสู่ฉากจบ
  const triggerBoss = state.player.score >= 3000 && state.dungeonLevel >= 5 && !state.bossSpawned;
  
  if (triggerBoss) {
    state.bossSpawned = true;
    return {
      x: canvas.width / 2 - 40, y: 100, size: 80,
      hp: 1200, maxHp: 1200, isBoss: true, speed: 1.8, color: "#a855f7"
    };
  }

  const isMiniBoss = Math.random() < 0.2;
  const size = isMiniBoss ? 45 : 30;
  return {
    x: Math.random() * (canvas.width - size),
    y: Math.random() * 250 + 60, // เกิดโซนด้านบน
    size: size,
    hp: isMiniBoss ? 200 * state.dungeonLevel : 45 * state.dungeonLevel,
    maxHp: isMiniBoss ? 200 * state.dungeonLevel : 45 * state.dungeonLevel,
    isBoss: false,
    isMiniBoss: isMiniBoss,
    speed: isMiniBoss ? 2.0 : 2.5 + Math.random()
  };
}

// สุ่มไอเท็มผลึกคริสตัลในสนาม
function spawnCrystal() {
  const r = Math.random();
  let color = "#38bdf8", value = 20;
  if (r > 0.85) { color = "#fbbf24"; value = 70; } // ผลึกทองหายาก
  return {
    x: Math.random() * (canvas.width - 24) + 12,
    y: Math.random() * (canvas.height - 200) + 160,
    size: 14, color, value, pulse: Math.random() * Math.PI
  };
}

// ระบบสร้างเอฟเฟกต์ตัวเลขดาเมจหรืออนุมูลพลังงาน
function createParticle(x, y, color, count = 6, text = "") {
  if (text !== "") {
    state.particles.push({ x, y, vx: 0, vy: -1.5, life: 40, color, text });
    return;
  }
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
      size: Math.random() * 3 + 2, life: 20, color, text: ""
    });
  }
}

// ฟังก์ชันระเบิดการฮีลที่เสถียรและทรงพลัง (ซื้อโพชั่นและฮีลทันที)
function executeHealing() {
  if (state.player.gold >= 50) {
    state.player.gold -= 50;
    const healHP = Math.floor(state.player.maxHp * 0.45); // ฮีลแรงสะใจ 45% ของเลือดสูงสุด
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + healHP);
    state.player.mana = Math.min(state.player.maxMana, state.player.mana + 25); // ฟื้นมานาร่วมด้วย
    createParticle(state.player.x + 15, state.player.y, "#34d399", 12, `+${healHP} HP ฟื้นฟู!`);
  } else {
    createParticle(state.player.x, state.player.y - 15, "#ef4444", 0, "ทองไม่พอซื้อโพชั่น!");
  }
}

// โจมตีปกติ (คลิกซ้าย)
function performAttack() {
  const now = Date.now();
  if (now - lastAttackTime < 300) return; // Cooldown การตีปกติ
  lastAttackTime = now;

  // คำนวณทิศทางไปยังเป้าหมายเมาส์
  const dx = mouse.x - (state.player.x + state.player.size / 2);
  const dy = mouse.y - (state.player.y + state.player.size / 2);
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len > 0) {
    state.projectiles.push({
      x: state.player.x + state.player.size / 2,
      y: state.player.y + state.player.size / 2,
      vx: (dx / len) * 10, vy: (dy / len) * 10,
      size: 6, damage: state.player.baseDamage, isSkill: false
    });
  }
}

// ใช้สกิลพิเศษระดับแรงดาเมจสูง (กด Q หรือคลิกขวา)
function performSkill() {
  if (state.player.mana >= 20) {
    state.player.mana -= 20;
    const dx = mouse.x - (state.player.x + state.player.size / 2);
    const dy = mouse.y - (state.player.y + state.player.size / 2);
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len > 0) {
      state.projectiles.push({
        x: state.player.x + state.player.size / 2,
        y: state.player.y + state.player.size / 2,
        vx: (dx / len) * 12, vy: (dy / len) * 12,
        size: 12, damage: state.player.skillDamage, isSkill: true
      });
      createParticle(state.player.x, state.player.y, "#a855f7", 10, "⚡ SKILL SHOT!");
    }
  } else {
    createParticle(state.player.x, state.player.y - 15, "#06b6d4", 0, "มานาหมด!");
  }
}

// ระบบแดชหลบหลีก (กด Shift พลังงาน Stamina)
function performDash() {
  if (state.player.stamina >= 30 && state.dashCooldown <= 0) {
    state.player.stamina -= 30;
    state.dashCooldown = 25; // เฟรม Cooldown
    let dx = 0, dy = 0;
    if (keyState["w"] || keyState["arrowup"]) dy = -1;
    if (keyState["s"] || keyState["arrowdown"]) dy = 1;
    if (keyState["a"] || keyState["arrowleft"]) dx = -1;
    if (keyState["d"] || keyState["arrowright"]) dx = 1;
    
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx*dx + dy*dy);
      state.player.x += (dx/len) * 55;
      state.player.y += (dy/len) * 55;
    } else {
      state.player.y -= 55; // แดชขึ้นด้านบนหากไม่ได้กดปุ่มทิศทาง
    }
    createParticle(state.player.x, state.player.y, "#fbbf24", 15, "💨 DASH!");
  }
}

// จัดการเมื่อชนะศัตรู
function handleEnemyDefeat(enemy) {
  if (enemy.isBoss) {
    state.gameCompleted = true; // ชนะบอสใหญ่ ปลดล็อคฉากจบเกมทันที
    return;
  }

  // ระบบสุ่มมอบรางวัลโบนัสทองคำ 5-15 ทองตามกำหนด
  const bonusGold = Math.floor(Math.random() * 11) + 5;
  state.player.gold += bonusGold;
  state.player.score += enemy.isMiniBoss ? 500 : 150;
  state.player.exp += enemy.isMiniBoss ? 60 : 25;
  
  createParticle(enemy.x, enemy.y, "#facc15", 8, `+${bonusGold} Gold`);

  // ตรรกะการเลเวลอัป
  if (state.player.exp >= state.player.nextLevelExp) {
    state.player.level++;
    state.player.exp -= state.player.nextLevelExp;
    state.player.maxHp += 20;
    state.player.hp = state.player.maxHp;
    state.player.baseDamage += 5;
    state.player.skillDamage += 12;
    state.dungeonLevel = Math.min(5, state.dungeonLevel + 1);
    createParticle(state.player.x, state.player.y, "#34d399", 20, "🎉 LEVEL UP!");
  }
}

// อัปเดตลูปความเคลื่อนไหวและฟิสิกส์
function update() {
  if (state.gameCompleted) return;

  // รับการควบคุมการเคลื่อนที่
  let dx = 0, dy = 0;
  if (keyState["w"] || keyState["arrowup"]) dy = -1;
  if (keyState["s"] || keyState["arrowdown"]) dy = 1;
  if (keyState["a"] || keyState["arrowleft"]) dx = -1;
  if (keyState["d"] || keyState["arrowright"]) dx = 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx*dx + dy*dy);
    state.player.x += (dx / len) * state.player.speed;
    state.player.y += (dy / len) * state.player.speed;
  }

  // ขอบเขตหน้าจอ
  state.player.x = Math.max(0, Math.min(canvas.width - state.player.size, state.player.x));
  state.player.y = Math.max(0, Math.min(canvas.height - state.player.size, state.player.y));

  // ฟื้นฟูมานาและสตามิน่าอัตโนมัติตามพลวัตเกม
  if (state.player.mana < state.player.maxMana) state.player.mana += 0.15;
  if (state.player.stamina < state.player.maxStamina) state.player.stamina += 0.4;
  if (state.dashCooldown > 0) state.dashCooldown--;

  // อัปเดตกระสุนยิง
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
      state.projectiles.splice(i, 1);
      continue;
    }
    // เช็คชนมอนสเตอร์
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (p.x > e.x && p.x < e.x + e.size && p.y > e.y && p.y < e.y + e.size) {
        e.hp -= p.damage;
        createParticle(p.x, p.y, p.isSkill ? "#a855f7" : "#38bdf8", 4, `-${p.damage}`);
        state.projectiles.splice(i, 1);
        if (e.hp <= 0) {
          handleEnemyDefeat(e);
          state.enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  // มอนสเตอร์โจมตีและตามผู้เล่น
  state.enemies.forEach(e => {
    const px = state.player.x + state.player.size/2;
    const py = state.player.y + state.player.size/2;
    const ex = e.x + e.size/2;
    const ey = e.y + e.size/2;
    const dist = Math.sqrt((px - ex)**2 + (py - ey)**2);

    if (dist > 0 && dist < 600) {
      e.x += ((px - ex) / dist) * e.speed;
      e.y += ((py - ey) / dist) * e.speed;
    }

    // ชนตัวผู้เล่นหักเลือดตามระดับความโหด
    if (state.player.x < e.x + e.size && state.player.x + state.player.size > e.x &&
        state.player.y < e.y + e.size && state.player.y + state.player.size > e.y) {
      state.player.hp = Math.max(0, state.player.hp - (e.isBoss ? 1.8 : e.isMiniBoss ? 0.7 : 0.3));
      if (state.player.hp <= 0) {
        state.player.hp = Math.floor(state.player.maxHp * 0.4); // เกิดใหม่เซฟตี้ฟื้นเลือด 40%
        state.player.gold = Math.floor(state.player.gold * 0.8);
        state.player.x = 480; state.player.y = 450;
        createParticle(state.player.x, state.player.y, "#ef4444", 0, "⚠️ แกนพลังงานวาร์ปฉุกเฉินกลับจุดเซฟ!");
      }
    }
  });

  // เดินเก็บคริสตัล
  for (let i = state.crystals.length - 1; i >= 0; i--) {
    const c = state.crystals[i];
    const dist = Math.sqrt((state.player.x + state.player.size/2 - c.x)**2 + (state.player.y + state.player.size/2 - c.y)**2);
    if (dist < state.player.size) {
      state.player.gold += c.value;
      state.player.score += c.value * 6;
      createParticle(c.x, c.y, c.color, 8, `+${c.value} ทองผลึก`);
      state.crystals.splice(i, 1);
    }
  }

  // ลบเอฟเฟกต์สิ้นอายุ
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // ควบคุมการสปอว์นศัตรูและคริสตัล
  if (state.enemies.length < 3 + state.dungeonLevel && !state.gameCompleted) state.enemies.push(spawnEnemy());
  if (state.crystals.length < 5) state.crystals.push(spawnCrystal());
}

// เรนเดอร์จอภาพและโครงสร้างหน้าต่างเมนูร้านค้ากริด
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 🏆 1. สภาวะหน้าจอฉากจบเกม (Victory Ending Phase) 🏆
  if (state.gameCompleted) {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 34px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎉 ภารกิจสำเร็จ: ทะลายมิติและหลุดพ้นอย่างสมบูรณ์ 🎉", canvas.width / 2, 160);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "18px 'Segoe UI'";
    ctx.fillText("คุณได้สยบ Rift Overlord และรวบรวมแก่นพลังงานเวลาทั้งหมดสำเร็จแล้ว!", canvas.width / 2, 220);
    
    // แผงสถิติการเล่นตอนจบเกมที่สวยงาม
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(260, 260, 440, 180);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(260, 260, 440, 180);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px 'Segoe UI'";
    ctx.textAlign = "left";
    ctx.fillText(`🏆 คะแนนเกียรติยศสะสม: ${state.player.score} แต้ม`, 290, 305);
    ctx.fillText(`⚔️ เลเวลสุดท้ายของผู้ล่า: Level ${state.player.level}`, 290, 340);
    ctx.fillText(`💰 คลังทองที่กักตุนกลับโลกจริง: ${state.player.gold} ทอง`, 290, 375);
    ctx.fillText(`✨ ระดับความเสถียรของระบบมิติ: 100% Stable`, 290, 410);

    ctx.textAlign = "center";
    ctx.fillStyle = "#91a1c7";
    ctx.font = "14px 'Segoe UI'";
    ctx.fillText("ขอบคุณที่ร่วมการทดสอบ — MDA Framework Production Ready", canvas.width / 2, 510);
    return;
  }

  // วาดพื้นหลัง Ground จากภาพลิงก์คลาวด์
  if (images.ground.complete && images.ground.naturalWidth !== 0) {
    ctx.drawImage(images.ground, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#040816";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // วาดคริสตัล Shards
  state.crystals.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    const scale = 1 + Math.sin(c.pulse) * 0.12;
    ctx.scale(scale, scale);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.moveTo(0, -c.size); ctx.lineTo(c.size, 0); ctx.lineTo(0, c.size); ctx.lineTo(-c.size, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    c.pulse += 0.07;
  });

  // วาดมอนสเตอร์ธรรมดา / มินิบอส / บอสใหญ่
  state.enemies.forEach(e => {
    if (e.isBoss && images.boss.complete && images.boss.naturalWidth !== 0) {
      ctx.drawImage(images.boss, e.x, e.y, e.size, e.size);
    } else if (!e.isBoss && images.enemy.complete && images.enemy.naturalWidth !== 0) {
      ctx.drawImage(images.enemy, e.x, e.y, e.size, e.size);
    } else {
      ctx.fillStyle = e.isBoss ? "#a855f7" : e.isMiniBoss ? "#f43f5e" : "#ef4444";
      ctx.fillRect(e.x, e.y, e.size, e.size);
    }

    // แถบ HP ของมอนสเตอร์ด้านบน
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(e.x, e.y - 10, e.size, 5);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(e.x, e.y - 10, (e.hp / e.maxHp) * e.size, 5);

    if (e.isBoss) {
      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 12px 'Segoe UI'";
      ctx.fillText("RIFT OVERLORD (บอสใหญ่)", e.x - 10, e.y - 18);
    }
  });

  // วาดกระสุนปืนแสง
  state.projectiles.forEach(p => {
    ctx.fillStyle = p.isSkill ? "#c084fc" : "#67e8f9";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
  });

  // วาดตัวละครผู้เล่น (ใช้รูปภาพจากคลาวด์)
  if (images.player.complete && images.player.naturalWidth !== 0) {
    ctx.drawImage(images.player, state.player.x, state.player.y, state.player.size, state.player.size);
    // วาดออร่าสีสกินล้อมรอบ
    ctx.strokeStyle = SKINS[state.player.currentSkin]?.color || "#38bdf8";
    ctx.lineWidth = 2;
    ctx.strokeRect(state.player.x, state.player.y, state.player.size, state.player.size);
    ctx.lineWidth = 1;
  } else {
    ctx.fillStyle = SKINS[state.player.currentSkin]?.color || "#38bdf8";
    ctx.fillRect(state.player.x, state.player.y, state.player.size, state.player.size);
  }

  // วาดเอฟเฟกต์ตัวอักษรและป๊อปอัพดาเมจ
  state.particles.forEach(p => {
    ctx.fillStyle = p.color;
    if (p.text) {
      ctx.font = "bold 13px 'Segoe UI', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  });

  // --- แผงหน้าจอ HUD ด้านบน ---
  ctx.fillStyle = "rgba(8, 15, 32, 0.9)";
  ctx.fillRect(16, 16, 440, 90);
  ctx.strokeStyle = "#38bdf8";
  ctx.strokeRect(16, 16, 440, 90);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 13px 'Segoe UI'";
  ctx.textAlign = "left";
  ctx.fillText(`ผู้เล่น เลเวล: ${state.player.level} (ชั้นมิติที่ ${state.dungeonLevel}/5)`, 30, 36);

  // หลอดเลือด HP
  ctx.fillStyle = "#1e293b"; ctx.fillRect(30, 48, 120, 10);
  ctx.fillStyle = "#ef4444"; ctx.fillRect(30, 48, (state.player.hp / state.player.maxHp) * 120, 10);
  
  // หลอดพลังมานา
  ctx.fillStyle = "#1e293b"; ctx.fillRect(165, 48, 120, 10);
  ctx.fillStyle = "#06b6d4"; ctx.fillRect(165, 48, (state.player.mana / state.player.maxMana) * 120, 10);

  // หลอดสตามิน่า
  ctx.fillStyle = "#1e293b"; ctx.fillRect(300, 48, 120, 10);
  ctx.fillStyle = "#fbbf24"; ctx.fillRect(300, 48, (state.player.stamina / state.player.maxStamina) * 120, 10);

  ctx.fillStyle = "#fbbf24"; ctx.fillText(`ทอง: ${state.player.gold} g`, 30, 84);
  ctx.fillStyle = "#cbd5e1"; ctx.fillText(`แต้ม: ${state.player.score}`, 135, 84);
  ctx.fillText(`พลังดาเมจพื้นฐาน: ${state.player.baseDamage}`, 240, 84);

  if (state.bossSpawned) {
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 14px 'Segoe UI'";
    ctx.fillText("⚠️ Rift Overlord ปรากฏตัวแล้ว! จงโค่นล้มมันเพื่อเปิดมิติจุดจบ!", 480, 40);
  }

  // --- 🛠️ จัดระเบียบหน้าต่างอัปเกรดสเตตัส & สั่งการฮีลระบบ (ปุ่ม P) 🛠️ ---
  if (state.showUpgradeMenu) {
    ctx.fillStyle = "rgba(2, 6, 23, 0.96)";
    ctx.fillRect(160, 130, 640, 350);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(160, 130, 640, 350);
    ctx.lineWidth = 1;

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 18px 'Segoe UI'";
    ctx.fillText("⚔️ แผงสั่งการระบบอัปเกรดสเตตัส (กดปุ่ม 'P' เพื่อปิด) ⚔️", 200, 170);

    ctx.fillStyle = "#91a1c7";
    ctx.font = "14px 'Segoe UI'";
    ctx.fillText(`ทองคำในปัจจุบัน: ${state.player.gold} ทอง`, 200, 200);

    // ปุ่มอัปดาเมจ
    ctx.fillStyle = "rgba(30, 41, 59, 0.9)"; ctx.fillRect(190, 225, 580, 52);
    ctx.fillStyle = "#f8fafc"; ctx.font = "bold 13px 'Segoe UI'";
    ctx.fillText("ซื้อตัวบีบอัดความหนาแน่น (+10 ดาเมจโจมตีปกติและสกิล) — [คลิกซื้อที่นี่]", 205, 246);
    ctx.fillStyle = "#facc15"; ctx.fillText("ราคาอัปเกรด: 100 ทอง", 205, 266);

    // ปุ่มอัปเลือดสูงสุด
    ctx.fillStyle = "rgba(30, 41, 59, 0.9)"; ctx.fillRect(190, 295, 580, 52);
    ctx.fillStyle = "#f8fafc";
    ctx.fillText("อัปเกรดความจุแกนพลังงาน (+30 Max HP ความอึด) — [คลิกซื้อที่นี่]", 205, 316);
    ctx.fillStyle = "#facc15"; ctx.fillText("ราคาอัปเกรด: 130 ทอง", 205, 336);

    // ปุ่มสั่งการฮีลระบบด่วน (ใช้รูปภาพไอคอนโพชั่นเติมพลังจากคลาวด์มาแสดงในกริด)
    ctx.fillStyle = "rgba(16, 185, 129, 0.15)"; ctx.fillRect(190, 365, 580, 55);
    if (images.potion.complete && images.potion.naturalWidth !== 0) {
      ctx.drawImage(images.potion, 205, 375, 35, 35);
    }
    ctx.fillStyle = "#34d399";
    ctx.fillText("❤️ สั่งการฟื้นฟูด่วนฉุกเฉิน (เติมพลังแรง 45% HP & ฟื้นมานาทันที) — [คลิกเพื่อกดใช้ฮีล]", 255, 386);
    ctx.fillStyle = "#facc15"; ctx.fillText("ราคาค่าฮีลระบบ: 50 ทอง", 255, 406);
  }

  // --- 🛒 จัดระเบียบหน้าต่างร้านค้าสกินแบบกึ่งกริดที่สมบูรณ์ (ปุ่ม B) 🛒 ---
  if (state.showShop) {
    ctx.fillStyle = "rgba(4, 8, 22, 0.98)";
    ctx.fillRect(180, 150, 600, 310);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(180, 150, 600, 310);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 17px 'Segoe UI'";
    ctx.fillText("🛒 คลังคอสเมติกสกินมิติ (กดปุ่ม 'B' เพื่อปิดหน้าร้านค้า)", 210, 190);

    let idx = 0;
    for (const [key, item] of Object.entries(SKINS)) {
      if (key === "default") continue;
      const yOffset = 220 + idx * 70;

      ctx.fillStyle = "rgba(30, 41, 59, 0.75)";
      ctx.fillRect(210, yOffset, 540, 55);

      // แสดงกรอบตัวอย่างสี
      ctx.fillStyle = item.color;
      ctx.fillRect(230, yOffset + 12, 30, 30);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 14px 'Segoe UI'";
      ctx.fillText(`${item.name} — ${item.desc}`, 280, yOffset + 24);
      ctx.fillStyle = "#a855f7";
      ctx.font = "12px 'Segoe UI'";
      ctx.fillText(`กดคีย์ลัดตัวเลข [ ${idx + 7} ] เพื่อสวมใส่เปลี่ยนสีสกินทันที`, 280, yOffset + 42);

      idx++;
    }
  }
}

// ระบบคลิกตรวจพิกัดบน Grid เมนูสำหรับซื้อของหรือกดใช้งานฮีล
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

  if (state.showUpgradeMenu) {
    if (mouseX >= 190 && mouseX <= 770) {
      // ซื้อเพิ่มแรงดาเมจ
      if (mouseY >= 225 && mouseY <= 277) {
        if (state.player.gold >= 100) {
          state.player.gold -= 100;
          state.player.baseDamage += 10;
          state.player.skillDamage += 15;
          createParticle(state.player.x + 15, state.player.y, "#38bdf8", 8, "+10 ดาเมจ!");
        } else { alert("ทองคำไม่เพียงพอ!"); }
      }
      // ซื้อเพิ่มขีดจำกัดเลือด
      if (mouseY >= 295 && mouseY <= 347) {
        if (state.player.gold >= 130) {
          state.player.gold -= 130;
          state.player.maxHp += 30;
          state.player.hp += 30;
          createParticle(state.player.x + 15, state.player.y, "#ef4444", 8, "+30 Max HP!");
        } else { alert("ทองคำไม่เพียงพอ!"); }
      }
      // คลิกเพื่อใช้งานฮีลพลังชีวิต
      if (mouseY >= 365 && mouseY <= 420) {
        executeHealing();
      }
    }
    return;
  }

  // หากไม่ได้เปิดเมนูอยู่ จะเป็นการยิงโจมตีปกติเมื่อคลิกซ้าย
  if (e.button === 0) performAttack();
});

// ดักจับการกดคีย์บอร์ด
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keyState[key] = true;

  if (key === " ") performAttack();
  if (key === "q") performSkill();
  if (e.key === "Shift") performDash();
  
  if (key === "p") state.showUpgradeMenu = !state.showUpgradeMenu;
  if (key === "b") state.showShop = !state.showShop;

  // การเปลี่ยนสกินด้วยปุ่มตัวเลข
  if (key === "7") state.player.currentSkin = "emerald";
  if (key === "8") state.player.currentSkin = "ruby";
  if (key === "9") state.player.currentSkin = "default";
});

document.addEventListener("keyup", (e) => {
  keyState[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
});

// บล็อกปุ่มขวาไม่ให้แสดง Context Menu เพื่อนำมาใช้กดสกิลแทนได้
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  performSkill();
});

// เริ่มต้นระบบลูปเกม
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
