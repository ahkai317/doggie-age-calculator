/* ============================================================
   功能總覽
   - 主題切換（淺色/深色），並把選擇儲存在 localStorage
   - 畫面載入時自動讀取 localStorage 還原：出生日期、計算結果、主題
   - 點擊「開始計算」會以公式 16 * ln(dogYears) + 31 計算並顯示
   - RWD 與樣式變動透過 CSS 控制；此檔以互動邏輯為主
   ============================================================ */

/* -------------------------
   常數與 DOM 參考
   ------------------------- */
   const LS_KEYS = {
    BIRTH: 'dog_birth_date_v1',
    RESULT: 'dog_human_result_v1',
    THEME: 'dog_theme_v1' // "light" 或 "dark"
  };

  const dateInput = document.getElementById('dogBirth');
  const btn = document.getElementById('calculateBtn');
  const resultDiv = document.getElementById('result');
  const themeToggle = document.getElementById('themeToggle');
  const switchText = document.getElementById('switchText');
  const root = document.documentElement; // 用於設定 data-theme 屬性

  /* -------------------------
     工具函式：年齡換算
     dogYears: 浮點數 (以年為單位)
     回傳：浮點數 (人類年齡)
     ------------------------- */
  function dogAgeToHuman(dogYears) {
    // 避免對 very small 或 0 使用 ln(0) 導致 -Inf
    // 若狗齡 < 0.01 年 (約 3.65 天)，用線性外推避免數值不穩定
    if (dogYears <= 0) return null;
    if (dogYears < 0.01) {
      // 簡單外推：以 0.01 年作為下界（這是為了數學穩定性）
      dogYears = 0.01;
    }
    return 16 * Math.log(dogYears) + 31;
  }

  /* -------------------------
     Local Storage 操作封裝
     ------------------------- */
  function saveToLS(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage 寫入失敗', e);
    }
  }
  function readFromLS(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('LocalStorage 讀取失敗', e);
      return null;
    }
  }

  /* -------------------------
     顯示結果（並儲存）
     text: 字串
     ------------------------- */
  function displayResult(text) {
    resultDiv.textContent = text;
    saveToLS(LS_KEYS.RESULT, text);
  }

  /* -------------------------
     計算流程
     - 取得使用者輸入的出生日期
     - 計算相差年數（考慮閏年，採 365.25 平均）
     - 使用 dogAgeToHuman 計算並四捨五入顯示
     - 錯誤輸入時顯示提示，並不儲存錯誤結果
     ------------------------- */
  function performCalculation() {
    const val = dateInput.value;
    if (!val) {
      displayResult('請輸入有效的出生年月日');
      return;
    }

    const birth = new Date(val + 'T00:00:00'); // 明確設定時區偏移避免跨日差異
    if (isNaN(birth.getTime())) {
      displayResult('請輸入有效的出生年月日');
      return;
    }

    const now = new Date();
    // 計算年差（毫秒轉換為年，採 365.25）
    const diffMs = now - birth;
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);

    if (years <= 0) {
      displayResult('出生日期必須早於現在');
      return;
    }

    const humanAge = dogAgeToHuman(years);
    if (humanAge === null || Number.isNaN(humanAge) || !isFinite(humanAge)) {
      displayResult('計算失敗：輸入值可能不合理');
      return;
    }

    // 格式化：狗齡保留兩位小數，人類年齡保留一位小數
    const displayDog = Number(years.toFixed(2));
    const displayHuman = Number(humanAge.toFixed(1));
    const text = `狗狗現在大約 ${displayDog} 歲的狗年齡，\n換算成人類大約是 ${displayHuman} 歲。`;

    displayResult(text);
  }

  /* -------------------------
     主題切換相關
     - 使用 data-theme 屬性來控制 CSS :root[data-theme="..."]
     - 使用 localStorage 儲存使用者偏好
     ------------------------- */
  function applyTheme(theme) {
    if (theme !== 'dark') theme = 'light';
    root.setAttribute('data-theme', theme);
    saveToLS(LS_KEYS.THEME, theme);

    // 更新切換器的狀態與文字（開燈 => light；關燈 => dark）
    if (theme === 'light') {
      themeToggle.checked = false;
      switchText.textContent = '開燈';
    } else {
      themeToggle.checked = true;
      switchText.textContent = '關燈';
    }
  }

  /* -------------------------
     初始化：載入 localStorage 的值（如果存在）
     - 還原日期輸入
     - 還原結果顯示
     - 還原主題
     ------------------------- */
  function initFromStorage() {
    // 還原出生日期
    const storedBirth = readFromLS(LS_KEYS.BIRTH);
    if (storedBirth) {
      // 檢查為符合 yyyy-mm-dd (HTML date 輸入格式)
      dateInput.value = storedBirth;
    }

    // 還原結果顯示
    const storedResult = readFromLS(LS_KEYS.RESULT);
    if (storedResult) {
      resultDiv.textContent = storedResult;
    }

    // 還原主題
    const storedTheme = readFromLS(LS_KEYS.THEME) || 'light';
    applyTheme(storedTheme);
  }

  /* -------------------------
     事件綁定
     - 按鈕點擊觸發計算
     - 輸入變動時自動儲存（避免使用者離開時遺失）
     - 主題切換時套用並儲存
     ------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    // 初始化畫面
    initFromStorage();

    // 若載入頁面時已有輸入但無結果，則不自動計算（保留使用者主動觸發）
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      performCalculation();
      // 計算完成後把目前的出生日期也儲存
      if (dateInput.value) saveToLS(LS_KEYS.BIRTH, dateInput.value);
    });

    // 當使用者變動日期，立即儲存到 localStorage（提高使用體驗）
    dateInput.addEventListener('change', function () {
      if (dateInput.value) saveToLS(LS_KEYS.BIRTH, dateInput.value);
    });

    // 主題切換器：打勾代表暗色主題（關燈）
    themeToggle.addEventListener('change', function () {
      if (themeToggle.checked) {
        applyTheme('dark');
      } else {
        applyTheme('light');
      }
    });

    // 可選：按 Enter 在日期輸入上也觸發計算（表單友善）
    dateInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        btn.click();
      }
    });
  });
