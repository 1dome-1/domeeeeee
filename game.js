const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ข้อมูลธีมสกินดั้งเดิม
const SKINS = {
  default: { name: "Classic Azure", color: "#38bdf8", desc: "สกินเริ่มต้นผู้ท่องมิติ" },
  emerald: { name: "Emerald Variant", color: "#34d399", desc: "สกินพลังชีวิตธรรมชาติ" },
  ruby: { name: "Ruby Core", color: "#f87171", desc: "สกินเร่งความโกรธเกรี้ยว" },
  gold: { name: "Royal Nexus", color: "#fbbf24", desc: "สกินทองคำมิติมั่งคั่ง" }
};

// สถานะและตรรกะระบบ RPG แบบสมดุลเสถียร
let state = {
  player: {
    x: 100, y: 150, size: 24, 
    hp: 100, maxHp: 100, 
    mana: 60, maxMana: 60,
    gold: 150, score: 0, speed: 4.5, level: 1, exp: 0, nextLevelExp: 100,
    projectileDamage: 20, // ดาเมจเริ่มต้นที่มีความเสถียร
    currentSkin: "default", direction: { x: 0, y: 1 }
  },
  projectiles: [],
  enemies: [],
  particles: [],
  crystals: [],
  dungeonLevel: 1,
  bossSpawned: false,
  gameCompleted: false, // สถานะเช็คฉากจบเกม
  showShop: false,
  showUpgradeMenu: false
};

const keyState = {};

// ฟังก์ชันจำและโหลดเซฟไฟล์
function loadState() {
  try {
    const saved = localStorage.getItem("crystal_hunter_stable_save");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.player && !parsed.gameCompleted) {
        state = { ...state, ...parsed };
      }
    }
  } catch (e) { console.error(e); }
}

function saveState() {
  if (state.gameCompleted) return; // ไม่เซฟทับถ้าจบเกมแล้ว
  try {
    localStorage.setItem("crystal_hunter_stable_save", JSON.stringify(state));
  } catch (e) { console.error(e); }
}

// สร้างมอนสเตอร์ตามระดับเลเวล
function spawnEnemy() {
  // หากคะแนนเกิน 2500 และถึงชั้น 5 จะปล่อยมอนสเตอร์ระดับบอสใหญ่เพื่อมุ่งสู่ฉากจบ
  const triggerBoss = state.player.score >= 2500 && state.dungeonLevel >= 5 && !state.bossSpawned;
  
  if (triggerBoss) {
    state.bossSpawned = true;
    return {
      x: canvas.width / 2 - 30, y: 100, size: 60,
      hp: 1000, maxHp: 1000, isBoss: true, speed: 2, color: "#a855f7"
    };
  }

  const isMiniBoss = Math.random() < 0.15;
  return {
    x: Math.random() * (canvas.width - 40) + 20,
    y: Math.random() * (canvas.height - 150) + 120,
    size: isMiniBoss ? 40 : 22,
    hp: isMiniBoss ? 150 * state.dungeonLevel : 35 * state.dungeonLevel,
    maxHp: isMiniBoss ? 150 * state.dungeonLevel : 35 * state.dungeonLevel,
    isBoss: false,
    isMiniBoss: isMiniBoss,
    speed: isMiniBoss ? 2.2 : 2.8 + Math.random()
  };
}

// สุ่มคริสตัล
function spawnCrystal() {
  const r = Math.random();
  let color = "#38bdf8", value = 15;
  if (r > 0.92) { color = "#fbbf24"; value = 80; } // ทองโบนัสสูง
  else if (r > 0.75) { color = "#c084fc"; value = 40; }
  return {
    x: Math.random() * (canvas.width - 30) + 15,
    y: Math.random() * (canvas.height - 160) + 130,
    size: 12, color, value, pulse: Math.random() * Math.PI
  };
}

// ระบบสร้างเม็ดเอฟเฟกต์/ดาเมจข้อความป๊อปอัพ
function createParticle(x, y, color, count = 8, text = "") {
  if (text !== "") {
    state.particles.push({ x, y, vx: 0, vy: -1.2, size: 13, life: 45, color, text });
    return;
  }
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
      size: Math.random() * 3 + 2, life: 25, color
    });
  }
}

// ระบบฮีล HP และฟื้นฟูพลังเวท (เสถียรและเรียกใช้งานได้จากแผงสเตตัสอัปเกรด)
function executeHealing() {
  if (state.player.gold >= 40) {
    state.player.gold -= 40;
    const healAmount = Math.floor(state.player.maxHp * 0.4); // ฮีลแรง 40% ของเลือดสูงสุด
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmount);
    state.player.mana = Math.min(state.player.maxMana, state.player.mana + 30); // ฟื้นมานาควบคู่
    createParticle(state.player.x + 12, state.player.y, "#34d399", 15, `+${healAmount} HP Recov!`);
    saveState();
  } else {
    alert("ทองคำของคุณไม่เพียงพอสำหรับการซื้อโพชั่นฟื้นฟู!");
  }
}

// ยิงกระสุนแสงดาเมจเสถียร
function fireProjectile() {
  if (state.player.mana >= 6) {
    state.player.mana -= 6;
    let vx = state.player.direction.x;
    let vy = state.player.direction.y;
    if (vx === 0 && vy === 0) vy = 1;

    state.projectiles.push({
      x: state.player.x + 12, y: state.player.y + 12,
      vx: vx * 9.5, vy: vy * 9.5, size: 6, damage: state.player.projectileDamage
    });
  } else {
    createParticle(state.player.x, state.player.y - 10, "#a7f3d0", 0, "Mana Short!");
  }
}

// ประมวลผลเมื่อฆ่ามอนสเตอร์และระบบสุ่มดร็อปทองเพิ่มโบนัส 5-15 ทองพร้อมเอฟเฟกต์ระเบิด
function handleEnemyDefeat(enemy) {
  createParticle(enemy.x + enemy.size/2, enemy.y + enemy.size/2, "#ef4444", 15);
  
  if (enemy.isBoss) {
    // บอสใหญ่ตาย -> ประตูจุดจบเปิดออกและพาเข้าสู่ฉากจบเกมทันที
    state.gameCompleted = true;
    return;
  }

  // มอนสเตอร์ธรรมดาและมินิบอสสุ่มดร็อปทองเพิ่มโบนัส 5-15 ทองตามเงื่อนไขข้อกำหนด
  const droppedGold = Math.floor(Math.random() * 11) + 5;
  state.player.gold += droppedGold;
  state.player.score += enemy.isMiniBoss ? 400 : 120;
  state.player.exp += enemy.isMiniBoss ? 50 : 20;

  createParticle(enemy.x, enemy.y, "#fbbf24", 8, `+${droppedGold} Gold`);

  // อัปเลเวลตัวละคร
  if (state.player.exp >= state.player.nextLevelExp) {
    state.player.level++;
    state.player.exp -= state.player.nextLevelExp;
    state.player.maxHp += 15;
    state.player.hp = state.player.maxHp;
    state.player.projectileDamage += 4; // เพิ่มดาเมจพื้นฐานฟรีเมื่อเลเวลอัป
    state.dungeonLevel = Math.min(5, state.dungeonLevel + 1);
    createParticle(state.player.x, state.player.y, "#34d399", 25, "LEVEL UP!");
  }
}

// อัปเดตลูปความเคลื่อนไหว
function update() {
  if (state.gameCompleted) return; // หยุดตรรกะทั้งหมดหากฉากจบแสดงผลอยู่

  // รับการเคลื่อนที่จากปุ่มคีย์บอร์ด
  let dx = 0, dy = 0;
  if (keyState["w"] || keyState["arrowup"]) dy = -1;
  if (keyState["s"] || keyState["arrowdown"]) dy = 1;
  if (keyState["a"] || keyState["arrowleft"]) dx = -1;
  if (keyState["d"] || keyState["arrowright"]) dx = 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx*dx + dy*dy);
    state.player.direction.x = dx / len;
    state.player.direction.y = dy / len;
    state.player.x += (dx / len) * state.player.speed;
    state.player.y += (dy / len) * state.player.speed;

    state.player.x = Math.max(0, Math.min(canvas.width - state.player.size, state.player.x));
    state.player.y = Math.max(0, Math.min(canvas.height - state.player.size, state.player.y));
  }

  // ฟื้นมานาอัตโนมัติตามเวลา
  if (state.player.mana < state.player.maxMana) state.player.mana += 0.12;

  // กระสุนพุ่งชนศัตรู
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx; p.y += p.vy;

    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
      state.projectiles.splice(i, 1);
      continue;
    }

    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (p.x > e.x && p.x < e.x + e.size && p.y > e.y && p.y < e.y + e.size) {
        e.hp -= p.damage;
        createParticle(p.x, p.y, "#38bdf8", 4);
        state.projectiles.splice(i, 1);

        if (e.hp <= 0) {
          handleEnemyDefeat(e);
          state.enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  // ปัญญาประดิษฐ์มอนสเตอร์
  state.enemies.forEach(e => {
    const targetX = state.player.x + 12;
    const targetY = state.player.y + 12;
    const diffX = targetX - (e.x + e.size/2);
    const diffY = targetY - (e.y + e.size/2);
    const dist = Math.sqrt(diffX*diffX + diffY*diffY);

    if (dist > 0 && dist < 500) {
      e.x += (diffX / dist) * e.speed;
      e.y += (diffY / dist) * e.speed;
    }

    // มอนสเตอร์โจมตีผู้เล่น
    if (state.player.x < e.x + e.size && state.player.x + state.player.size > e.x &&
        state.player.y < e.y + e.size && state.player.y + state.player.size > e.y) {
      state.player.hp = Math.max(0, state.player.hp - (e.isBoss ? 1.5 : e.isMiniBoss ? 0.6 : 0.25));
      if (state.player.hp <= 0) {
        state.player.hp = Math.max(10, Math.floor(state.player.maxHp * 0.4));
        state.player.gold = Math.floor(state.player.gold * 0.75); // หักทองบางส่วนเมื่อพลาดท่า
        state.player.x = 100; state.player.y = 150;
        alert("แกนพลังงานขัดข้อง! ระบบทำการวาร์ปคุณกลับสู่จุดปลอดภัยในมิติเดิม!");
      }
    }
  });

  // เดินเก็บคริสตัล Shards
  for (let i = state.crystals.length - 1; i >= 0; i--) {
    const c = state.crystals[i];
    const distance = Math.sqrt(Math.pow((state.player.x+12) - c.x, 2) + Math.pow((state.player.y+12) - c.y, 2));
    if (distance < state.player.size) {
      state.player.gold += c.value;
      state.player.score += c.value * 5;
      createParticle(c.x, c.y, c.color, 8, `+${c.value} Shards`);
      state.crystals.splice(i, 1);
    }
  }

  // เคลียร์อายุของเอฟเฟกต์
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // ควบคุมจำนวนการเกิดของวัตถุ
  if (state.enemies.length < 3 + state.dungeonLevel && !state.gameCompleted) state.enemies.push(spawnEnemy());
  if (state.crystals.length < 5) state.crystals.push(spawnCrystal());
}

// เรนเดอร์จอภาพและโครงสร้างหน้าต่างร้านค้ากริด
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // สภาวะหน้าจอฉากจบเกมแบบ Production
  if (state.gameCompleted) {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 32px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎉 VICTORY: THE INTERDIMENSIONAL ESCAPE 🎉", canvas.width / 2, 180);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "18px 'Segoe UI'";
    ctx.fillText("คุณได้ทำลายศัตรูระดับ Rift Overlord และรวบรวมเศษเสี้ยวเวลาได้สำเร็จ!", canvas.width / 2, 240);
    
    // แสดงสถิติสรุปความสำเร็จ
    ctx.fillStyle = "rgba(30, 41, 59, 0.6)";
    ctx.fillRect(280, 280, 400, 160);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(280, 280, 400, 160);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px 'Segoe UI'";
    ctx.textAlign = "left";
    ctx.fillText(`คะแนนรวมทั้งหมดสุทธิ: ${state.player.score} คะแนน`, 310, 320);
    ctx.fillText(`เลเวลที่ขึ้นไปถึง: Level ${state.player.level}`, 310, 350);
    ctx.fillText(`ทองสะสมคงเหลือในคลัง: ${state.player.gold} ทอง`, 310, 380);
    ctx.fillText(`สถานะการหลุดพ้นมิติ: ปลอดภัยสมบูรณ์`, 310, 410);

    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px 'Segoe UI'";
    ctx.fillText("พัฒนาเสร็จสมบูรณ์ระดับเสถียร — ปล่อยระบบผ่าน Vercel เรียบร้อยแล้ว", canvas.width / 2, 500);
    return;
  }

  // วาดฉากปกติ
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // วาดผลึก Shards
  state.crystals.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    const scale = 1 + Math.sin(c.pulse) * 0.15;
    ctx.scale(scale, scale);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.moveTo(0, -c.size); ctx.lineTo(c.size, 0); ctx.lineTo(0, c.size); ctx.lineTo(-c.size, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    c.pulse += 0.06;
  });

  // วาดมอนสเตอร์ในแมพ
  state.enemies.forEach(e => {
    ctx.fillStyle = e.isBoss ? "#a855f7" : e.isMiniBoss ? "#f43f5e" : "#ef4444";
    ctx.fillRect(e.x, e.y, e.size, e.size);

    // แถบเลือดมอนสเตอร์
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(e.x, e.y - 8, e.size, 4);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(e.x, e.y - 8, (e.hp / e.maxHp) * e.size, 4);

    if (e.isBoss) {
      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("RIFT OVERLORD (BOSS)", e.x - 10, e.y - 15);
    }
  });

  // วาดกระสุน
  state.projectiles.forEach(p => {
    ctx.fillStyle = "#67e8f9";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
  });

  // วาดตัวผู้เล่น
  const skinColor = SKINS[state.player.currentSkin]?.color || "#38bdf8";
  ctx.fillStyle = skinColor;
  ctx.fillRect(state.player.x, state.player.y, state.player.size, state.player.size);

  // วาดเอฟเฟกต์อนุภาค/ตัวอักษรดาเมจ
  state.particles.forEach(p => {
    ctx.fillStyle = p.color;
    if (p.text) {
      ctx.font = "bold 12px 'Segoe UI', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  });

  // แท่น HUD แสดงสเตตัสหลักด้านบน
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(15, 15, 420, 85);
  ctx.strokeStyle = "#38bdf8";
  ctx.strokeRect(15, 15, 420, 85);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 13px 'Segoe UI'";
  ctx.textAlign = "left";
  ctx.fillText(`ผู้ล่ามิติ เลเวล: ${state.player.level} (มิติชั้นที่ ${state.dungeonLevel}/5)`, 30, 36);

  // แถบ HP
  ctx.fillStyle = "#334155"; ctx.fillRect(30, 46, 160, 10);
  ctx.fillStyle = "#ef4444"; ctx.fillRect(30, 46, (state.player.hp / state.player.maxHp) * 160, 10);
  
  // แถบพลังมานา
  ctx.fillStyle = "#334155"; ctx.fillRect(210, 46, 160, 10);
  ctx.fillStyle = "#06b6d4"; ctx.fillRect(210, 46, (state.player.mana / state.player.maxMana) * 160, 10);

  ctx.fillStyle = "#fbbf24";
  ctx.fillText(`ทอง: ${state.player.gold} g`, 30, 78);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`คะแนน: ${state.player.score}`, 140, 78);
  ctx.fillText(`ดาเมจกระสุน: ${state.player.projectileDamage}`, 260, 78);

  // ข้อความแจ้งเตือนเมื่อบอสเกิด
  if (state.bossSpawned) {
    ctx.fillStyle = "#f43f5e";
    ctx.font = "bold 14px 'Segoe UI'";
    ctx.fillText("⚠️ คำเตือน: Rift Overlord เกิดแล้ว! กำจัดมันเพื่อปลดล็อคฉากจบ!", 460, 40);
  }

  // --- จัดระเบียบหน้าต่างอัปเกรดสเตตัส (ปุ่ม P) ---
  if (state.showUpgradeMenu) {
    ctx.fillStyle = "rgba(2, 6, 23, 0.95)";
    ctx.fillRect(160, 120, 640, 360);
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.strokeRect(160, 120, 640, 360);
    ctx.lineWidth = 1;

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 18px 'Segoe UI'";
    ctx.fillText("⚔️ แผงเพิ่มศักยภาพผู้ท่องมิติ (กดปุ่ม 'P' เพื่อปิดเมนู) ⚔️", 200, 160);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px 'Segoe UI'";
    ctx.fillText(`คลังทองของคุณในปัจจุบัน: ${state.player.gold} ทอง`, 200, 190);

    // รายการปุ่มที่ 1: อัปเกรดความแรงดาเมจ
    ctx.fillStyle = "rgba(30, 41, 59, 0.9)"; ctx.fillRect(190, 215, 580, 50);
    ctx.fillStyle = "#f8fafc"; ctx.font = "bold 13px 'Segoe UI'";
    ctx.fillText("อัปเกรดตัวบีบอัดกระสุนแสง (+8 แรงดาเมจการโจมตี) — [คลิกซื้อที่แถบนี้]", 205, 235);
    ctx.fillStyle = "#fbbf24"; ctx.fillText("ราคาอัปเกรด: 120 ทอง", 205, 253);

    // รายการปุ่มที่ 2: เพิ่มเกราะเลือดสูงสุด
    ctx.fillStyle = "rgba(30, 41, 59, 0.9)"; ctx.fillRect(190, 280, 580, 50);
    ctx.fillStyle = "#f8fafc";
    ctx.fillText("อัปเกรดแกนพลังงานชุดเกราะ (+25 Max HP ขีดจำกัดเลือด) — [คลิกซื้อที่แถบนี้]", 205, 300);
    ctx.fillStyle = "#fbbf24"; ctx.fillText("ราคาอัปเกรด: 150 ทอง", 205, 318);

    // รายการปุ่มที่ 3: ระบบซื้อการฮีลฟื้นฟูตามคำสั่ง
    ctx.fillStyle = "rgba(15, 118, 110, 0.4)"; ctx.fillRect(190, 345, 580, 50);
    ctx.fillStyle = "#34d399";
    ctx.fillText("❤️ สั่งการฟื้นฟูฉุกเฉิน (ฮีลแรง 40% HP & รีมานาด่วน) — [คลิกเพื่อกดใช้ฮีล]", 205, 365);
    ctx.fillStyle = "#fbbf24"; ctx.fillText("ราคาค่าฮีลระบบ: 40 ทอง", 205, 383);
  }

  // --- จัดระเบียบหน้าต่างร้านค้าสกินแบบกึ่งกริด (ปุ่ม B) ---
  if (state.showShop) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
    ctx.fillRect(180, 140, 600, 310);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(180, 140, 600, 310);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px 'Segoe UI'";
    ctx.fillText("🛒 Dimensional Chroma Hub (กดปุ่ม 'B' เพื่อปิดหน้าร้านค้า)", 210, 180);

    let idx = 0;
    for (const [key, item] of Object.entries(SKINS)) {
      if (key === "default") continue;
      const yOffset = 210 + idx * 65;

      ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
      ctx.fillRect(210, yOffset, 540, 50);

      ctx.fillStyle = item.color;
      ctx.fillRect(225, yOffset + 12, 25, 25);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 13px 'Segoe UI'";
      ctx.fillText(`${item.name} — ${item.desc}`, 270, yOffset + 24);
      ctx.fillStyle = "#34d399";
      ctx.font = "11px 'Segoe UI'";
      ctx.fillText(`พร้อมใช้งานสำหรับการทดสอบ [กดปุ่มตัวเลข ${idx + 7} เพื่อสวมใส่สีนี้]`, 270, yOffset + 40);

      idx++;
    }
  }
}

// ตรรกะตรวจจับพิกัดการคลิกซื้อของและกดปุ่มฮีลในเมนู P
canvas.addEventListener("mousedown", (e) => {
  if (!state.showUpgradeMenu) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const mouseY = ((e.clientY - rect.top) / rect.height) * canvas.height;

  // เช็คขอบเขตแกน X ของปุ่มอัปเกรด
  if (mouseX >= 190 && mouseX <= 770) {
    // ปุ่มดาเมจ
    if (mouseY >= 215 && mouseY <= 265) {
      if (state.player.gold >= 120) {
        state.player.gold -= 120;
        state.player.projectileDamage += 8;
        createParticle(state.player.x + 12, state.player.y, "#38bdf8", 10, "+8 Dmg Up!");
        saveState();
      } else { alert("ทองคำไม่เพียงพอสำหรับการอัปดาเมจ!"); }
    }
    // ปุ่มเลือดสูงสุด
    if (mouseY >= 280 && mouseY <= 330) {
      if (state.player.gold >= 150) {
        state.player.gold -= 150;
        state.player.maxHp += 25;
        state.player.hp += 25;
        createParticle(state.player.x + 12, state.player.y, "#ef4444", 10, "+25 Max HP!");
        saveState();
      } else { alert("ทองคำไม่เพียงพอสำหรับการอัปเกราะเลือด!"); }
    }
    // ปุ่มการกดใช้ฮีลแรง
    if (mouseY >= 345 && mouseY <= 395) {
      executeHealing();
    }
  }
});

// คีย์บอร์ดคอนโทรล
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keyState[key] = true;

  if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    fireProjectile();
  }
  if (key === "p") state.showUpgradeMenu = !state.showUpgradeMenu;
  if (key === "b") state.showShop = !state.showShop;

  // การกดสลับสกิน
  if (key === "7") state.player.currentSkin = "emerald";
  if (key === "8") state.player.currentSkin = "ruby";
  if (key === "9") state.player.currentSkin = "gold";
  if (key === "0") state.player.currentSkin = "default";
});

document.addEventListener("keyup", (e) => {
  keyState[e.key.toLowerCase()] = false;
});

// รันระบบ Game Loop
function mainLoop() {
  update();
  draw();
  requestAnimationFrame(mainLoop);
}

loadState();
setInterval(saveState, 20000); // เซฟความคืบหน้าแบบออโต้รันทุกๆ 20 วินาที
mainLoop();
