window.PICKO = window.PICKO || {};

(function (exports) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function toast(msg) {
    let el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("on"), 1600);
  }

  // Pre-process line: remove commas inside quotes FIRST, then strip quotes
  function cleanCSVLine(line) {
    if (!line) return "";
    let s = line.replace(/"([^"]*)"/g, (m, p1) => '"' + p1.replace(/,/g, "") + '"');
    s = s.replace(/'([^']*)'/g, (m, p1) => "'" + p1.replace(/,/g, "") + "'");
    return s.replace(/["']/g, "");
  }

  // Pure digits cleaning helper (removes quotes, commas, spaces, non-digits)
  function cleanPureDigits(val) {
    if (val == null) return "";
    return String(val)
      .replace(/["']/g, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .replace(/[^0-9]/g, "");
  }

  function getBallClass(n) {
    const num = Number(n);
    if (num <= 10) return "b1";
    if (num <= 20) return "b2";
    if (num <= 30) return "b3";
    if (num <= 40) return "b4";
    return "b5";
  }

  function ballEl(n, extra) {
    return `<span class="ball ${getBallClass(n)} ${extra || ""}">${n}</span>`;
  }

  function ballsHtml(nums, bonus) {
    return (
      nums.map((n) => ballEl(n)).join("") +
      (bonus != null ? `<span class="plus">+</span>${ballEl(bonus, "bonus")}` : "")
    );
  }

  function pensionHtml(group, digits) {
    const digitsArr = Array.isArray(digits) ? digits : String(digits).split("");
    const balls = digitsArr
      .map((d, i) => `<span class="group-ball b${(i % 6) + 1}">${d}</span>`)
      .join("");
    return `
      <div class="pension-row">
        <div class="group">
          <span class="group-ball team">${cleanPureDigits(group)}</span>
          <span class="group-label">조</span>
        </div>
        <div class="group-balls">${balls}</div>
      </div>
    `;
  }

  function heatColor(t) {
    const a = [28, 28, 30];
    const b = [200, 200, 204];
    const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
    return `rgb(${c.join(",")})`;
  }

  function copyText(text) {
    const ok = () => toast(text);
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        ok();
      } catch (err) {
        toast("복사 실패");
      }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(fallback);
    } else {
      fallback();
    }
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length === 3) return `${parts[0]}.${parts[1]}.${parts[2]}`;
    return iso;
  }

  function getLottoDate(round) {
    const r = Number(round);
    if (isNaN(r) || r < 1) return "";
    const d = new Date(2002, 11, 7);
    d.setDate(d.getDate() + (r - 1) * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  }

  function getPensionDate(round) {
    const r = Number(round);
    if (isNaN(r) || r < 1) return "";
    const d = new Date(2020, 4, 7);
    d.setDate(d.getDate() + (r - 1) * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}.${m}.${day}`;
  }

  function parseAIReport(text) {
    if (!text) return "";
    let s = String(text).trim();

    // 0. Pre-clean ** bold markers wrapped around or inside <ball> tags
    s = s.replace(/\*\*<ball>(\d+)<\/ball>\*\*/gi, '<ball>$1</ball>');
    s = s.replace(/<ball>\*\*(\d+)\*\*<\/ball>/gi, '<ball>$1</ball>');

    // 1. Convert <ball>N</ball> custom tag to colorful mini lottery balls
    s = s.replace(/<ball>(\d+)<\/ball>/gi, (match, p1) => {
      const num = parseInt(p1, 10);
      const ballClass = getBallClass(num);
      return `<span class="ai-inline-ball ${ballClass}">${num}</span>`;
    });

    // 2. Convert <bold>content</bold> to bold white highlight text
    s = s.replace(/<bold>(.*?)<\/bold>/gi, '<strong class="ai-tag-bold">$1</strong>');

    // 2. Convert Markdown headers (# shifted down 1 level for card layout)
    s = s.replace(/^#### (.*$)/gim, '<h5 style="margin:6px 0 2px; font-size:12px; font-weight:600; color:var(--muted);">$1</h5>');
    s = s.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px; font-size:13px; font-weight:600; color:var(--fg);">$1</h4>');
    s = s.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 4px; font-size:14px; font-weight:650; color:var(--fg);">$1</h3>');
    s = s.replace(/^# (.*$)/gim, '<h2 style="margin:12px 0 6px; font-size:15px; font-weight:700; color:var(--fg); border-bottom:1px solid var(--line); padding-bottom:4px;">$1</h2>');

    // 3. Convert Markdown bold (**text** or __text__)
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="ai-tag-bold">$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong class="ai-tag-bold">$1</strong>');

    // 4. Convert Markdown italic (*text* or _text_)
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 5. Convert Inline code (`code`)
    s = s.replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>');

    // 6. Convert Bullet list items (- item or * item)
    s = s.replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left:16px; margin-bottom:2px;">$1</li>');

    // 7. Convert Line breaks (\n\n -> spacing, \n -> single break)
    s = s.replace(/\n{2,}/g, '<div style="height:6px;"></div>');
    s = s.replace(/\n/g, '<br/>');

    return s;
  }

  exports.utils = {
    $,
    $$,
    toast,
    cleanCSVLine,
    cleanPureDigits,
    getBallClass,
    ballEl,
    ballsHtml,
    pensionHtml,
    heatColor,
    copyText,
    fmtDate,
    getLottoDate,
    getPensionDate,
    parseAIReport,
  };
})(window.PICKO);

;
window.PICKO = window.PICKO || {};

(function (exports) {
  const { cleanCSVLine, cleanPureDigits, getBallClass } = exports.utils;

  const LOTTO_CSV_URL = "https://raw.githubusercontent.com/ysb5397/pickto/main/data/lotto645.csv";
  const PENSION_CSV_URL = "https://raw.githubusercontent.com/ysb5397/pickto/main/data/pension720.csv";

  let fetchedData = null;

  function parseLottoCSV(text) {
    const lines = text.split(/\r?\n/);
    const list = [];
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const cleanedLine = cleanCSVLine(line);
      const cols = cleanedLine.split(",").map((c) => c.trim());
      if (cols.length < 7) continue;

      const roundStr = cleanPureDigits(cols[0]);
      if (!roundStr) continue;

      const nums = cols
        .slice(1, 7)
        .map((c) => parseInt(cleanPureDigits(c), 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 45);

      if (nums.length < 5) continue;

      let bonus = cols[7] ? parseInt(cleanPureDigits(cols[7]), 10) : null;
      if (bonus != null && (isNaN(bonus) || bonus < 1 || bonus > 45)) {
        bonus = null;
      }

      list.push({ round: roundStr, nums, bonus });
    }
    return list;
  }

  function parsePensionCSV(text) {
    const lines = text.split(/\r?\n/);
    const list = [];
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const cleanedLine = cleanCSVLine(line);
      const cols = cleanedLine.split(",").map((c) => c.trim());
      if (cols.length < 3) continue;

      const roundStr = cleanPureDigits(cols[0]);
      if (!roundStr) continue;

      const groupStr = cleanPureDigits(cols[1]);
      const rawDigitStr = cleanPureDigits(cols[2]);
      const digitsStr = rawDigitStr ? rawDigitStr.padStart(6, "0") : "000000";
      const digits = digitsStr.split("");

      list.push({ round: roundStr, group: groupStr || "1", digits });
    }
    return list;
  }

  function validateLottoData(list) {
    if (!list || list.length === 0) {
      return { isValid: false, maxRound: 0, hasGap: true, errorMsg: "데이터가 비어 있습니다." };
    }
    const rounds = list.map((r) => Number(r.round)).filter((n) => !isNaN(n) && n > 0);
    const maxRound = Math.max(...rounds);
    const roundSet = new Set(rounds);

    let hasGap = false;
    for (let r = 1; r <= maxRound; r++) {
      if (!roundSet.has(r)) {
        hasGap = true;
        break;
      }
    }

    let hasInvalid = list.some((item) => !item.nums || item.nums.length < 5);

    const isValid = !hasGap && !hasInvalid;
    const errorMsg = isValid
      ? "✓ 회차 데이터 검증 완료 (누락 없음)"
      : hasGap
      ? "⚠️ 일부 회차 데이터가 누락되었습니다."
      : "⚠️ 일부 회차 데이터가 불완전합니다.";

    return { isValid, maxRound, hasGap, errorMsg };
  }

  function validatePensionData(list) {
    if (!list || list.length === 0) {
      return { isValid: false, maxRound: 0, hasGap: true, errorMsg: "데이터가 비어 있습니다." };
    }
    const rounds = list.map((r) => Number(r.round)).filter((n) => !isNaN(n) && n > 0);
    const maxRound = Math.max(...rounds);
    const roundSet = new Set(rounds);

    let hasGap = false;
    for (let r = 1; r <= maxRound; r++) {
      if (!roundSet.has(r)) {
        hasGap = true;
        break;
      }
    }

    let hasInvalid = list.some((item) => !item.group || !item.digits || item.digits.length !== 6);

    const isValid = !hasGap && !hasInvalid;
    const errorMsg = isValid
      ? "✓ 회차 데이터 검증 완료 (누락 없음)"
      : hasGap
      ? "⚠️ 일부 회차 데이터가 누락되었습니다."
      : "⚠️ 일부 회차 데이터가 불완전합니다.";

    return { isValid, maxRound, hasGap, errorMsg };
  }

  const assetBase = new URL('./', document.currentScript?.src || location.href);
  const storage = { get(key) { try { return localStorage.getItem(key); } catch { return null; } }, set(key,value) { try { localStorage.setItem(key,value); } catch {} } };
  async function readCSV(url) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),8000);
    try { const response = await fetch(url,{cache:'no-store',signal:controller.signal}); if(!response.ok)throw Error('데이터를 불러오지 못했어.'); return await response.text(); } finally { clearTimeout(timer); }
  }
  async function fetchCSVData(forceRefresh=false) {
    if(!forceRefresh && fetchedData)return fetchedData;
    let lottoText,pensionText;
    if(forceRefresh) {
      [lottoText,pensionText]=await Promise.all([readCSV(LOTTO_CSV_URL+'?_t='+Date.now()),readCSV(PENSION_CSV_URL+'?_t='+Date.now())]);
    } else {
      [lottoText,pensionText]=await Promise.all([readCSV(new URL('pick_o-data/lotto645.csv',assetBase)),readCSV(new URL('pick_o-data/pension720.csv',assetBase))]);
      const cachedLotto=storage.get('PICKO_LOTTO_CSV'),cachedPension=storage.get('PICKO_PENSION_CSV');
      if(cachedLotto && validateLottoData(parseLottoCSV(cachedLotto)).maxRound>validateLottoData(parseLottoCSV(lottoText)).maxRound)lottoText=cachedLotto;
      if(cachedPension && validatePensionData(parsePensionCSV(cachedPension)).maxRound>validatePensionData(parsePensionCSV(pensionText)).maxRound)pensionText=cachedPension;
    }
    const lotto=parseLottoCSV(lottoText),pension=parsePensionCSV(pensionText),lottoCheck=validateLottoData(lotto),pensionCheck=validatePensionData(pension);
    if(!lotto.length||!pension.length)throw Error('추첨 데이터가 비어 있어.');
    storage.set('PICKO_LOTTO_CSV',lottoText);storage.set('PICKO_PENSION_CSV',pensionText);
    fetchedData={lotto,pension,lottoCheck,pensionCheck};return fetchedData;
  }

  // Hypergeometric distribution theoretical lookups (N=45, k=6)
  // Odd numbers (K=23, N-K=22)
  const HYPERGEO_ODD_LOG = [
    Math.log(74613 / 8145060),    // 0
    Math.log(605682 / 8145060),   // 1
    Math.log(1850695 / 8145060),  // 2
    Math.log(2727340 / 8145060),  // 3 (mode: 0.334846)
    Math.log(2045505 / 8145060),  // 4
    Math.log(740278 / 8145060),   // 5
    Math.log(100947 / 8145060),   // 6
  ];
  const MAX_ODD_LOG = HYPERGEO_ODD_LOG[3];

  // Low numbers 1~22 (K=22, N-K=23)
  const HYPERGEO_LOW_LOG = [
    Math.log(100947 / 8145060),   // 0
    Math.log(740278 / 8145060),   // 1
    Math.log(2045505 / 8145060),  // 2
    Math.log(2727340 / 8145060),  // 3 (mode: 0.334846)
    Math.log(1850695 / 8145060),  // 4
    Math.log(605682 / 8145060),   // 5
    Math.log(74613 / 8145060),    // 6
  ];
  const MAX_LOW_LOG = HYPERGEO_LOW_LOG[3];

  // Pension Lottery Binomial(6, 0.5) lookup divided by mode P(3) = 20/64
  const BINOM_ODD_RATIO = [0.05, 0.30, 0.75, 1.00, 0.75, 0.30, 0.05];
  // c * log2(c) lookup for exact Shannon Entropy calculation
  const C_LOG2_C = [
    0,
    0,
    2.0,
    4.754887502163468,
    8.0,
    11.609640474436812,
    15.509775004326936,
  ];
  const MAX_PENSION_ENTROPY = 2.584962500721156; // log2(6)

  const PICKTOEngine = {
    ballClass: getBallClass,
    LottoEngine: class {
      constructor(list) {
        this.list = list;
      }
      snapshot() {
        const list = this.list;
        const last = list[list.length - 1] || { round: "0", nums: [1, 2, 3, 4, 5, 6], bonus: 7 };
        const freqs = new Int32Array(47);
        const lastSeen = new Int32Array(47);
        const coOccur = Array.from({ length: 47 }, () => new Int32Array(47));
        const pastWinsMap = new Map();
        const recentWinsMasks = [];

        list.forEach((item, idx) => {
          const sortedNums = [...item.nums].filter((n) => n >= 1 && n <= 45).sort((a, b) => a - b);
          if (sortedNums.length >= 6) {
            const winKey = sortedNums.slice(0, 6).join(",");
            pastWinsMap.set(winKey, (pastWinsMap.get(winKey) || 0) + 1);

            if (idx >= list.length - 100) {
              let mask = 0n;
              for (let n of sortedNums.slice(0, 6)) mask |= (1n << BigInt(n));
              recentWinsMasks.push(mask);
            }

            for (let i = 0; i < 6; i++) {
              const u = sortedNums[i];
              freqs[u]++;
              lastSeen[u] = idx;
              for (let j = i + 1; j < 6; j++) {
                const v = sortedNums[j];
                coOccur[u][v]++;
                coOccur[v][u]++;
              }
            }
          }
        });

        const n = list.length;
        const expected = (n * 6) / 45;
        const all = [];
        for (let i = 1; i <= 45; i++) {
          all.push({ n: i, freq: freqs[i], gap: n - 1 - lastSeen[i] });
        }
        const sortedTop = [...all].sort((a, b) => b.freq - a.freq);
        const topCluster = sortedTop.slice(0, 9).map((x) => x.n);

        all.forEach((x) => {
          x.inCluster = topCluster.includes(x.n);
        });

        const overdue = [...all].sort((a, b) => b.gap - a.gap).slice(0, 5);

        // Precompute Lift Matrix (Float32Array) to solve Spurious Correlation
        const liftMatrix = Array.from({ length: 47 }, () => new Float32Array(47));
        for (let i = 1; i <= 45; i++) {
          for (let j = 1; j <= 45; j++) {
            if (i !== j && freqs[i] > 0 && freqs[j] > 0) {
              liftMatrix[i][j] = (coOccur[i][j] * n) / (freqs[i] * freqs[j]);
            }
          }
        }

        // Recent 30 rounds short-term hot numbers
        const recent30 = list.slice(-30);
        const recent30Freqs = new Int32Array(47);
        recent30.forEach((item) => {
          item.nums.forEach((num) => {
            if (num >= 1 && num <= 45) recent30Freqs[num]++;
          });
        });
        const recentHotCluster = [...all]
          .map((x) => ({ n: x.n, rFreq: recent30Freqs[x.n] }))
          .sort((a, b) => b.rFreq - a.rFreq)
          .slice(0, 7)
          .map((x) => x.n);
        const recentHotSet = new Set(recentHotCluster);
        const overdueSet = new Set(overdue.map((o) => o.n));

        const avgCoOccur = (n * 15) / 990;

        return {
          last: { round: cleanPureDigits(last.round), nums: last.nums, bonus: last.bonus, date: "" },
          n,
          all,
          top: sortedTop.slice(0, 5),
          expected,
          cluster: topCluster.map((num) => ({ n: num })),
          overdue,
          pastWinsMap,
          recentHotCluster,
          recentHotSet,
          overdueSet,
          recentWinsMasks,
          coOccur,
          liftMatrix,
          avgCoOccur,
        };
      }

      calculateFit(nums, track, snap, minThreshold = 0) {
        // [1. Ultra-fast O(1) Rejection for extreme anomalies]
        const sum = nums[0] + nums[1] + nums[2] + nums[3] + nums[4] + nums[5];
        if (sum < 85 || sum > 195) return 60.0;

        let oddCount = 0;
        let lowCount = 0;
        for (let i = 0; i < 6; i++) {
          if (nums[i] & 1) oddCount++;
          if (nums[i] <= 22) lowCount++;
        }
        if (oddCount === 0 || oddCount === 6) return 60.0;

        // [2. Continuous Gaussian Sum Kernel: mu=138, sigma=22.5]
        const sumDev = sum - 138;
        const logSumDensity = -(sumDev * sumDev) / 1012.5; // range: [-3.2, 0] for sum in [85, 195]

        // [3. Joint Hypergeometric Likelihood (Decoupled Multicollinearity)]
        const logOddRelative = HYPERGEO_ODD_LOG[oddCount] - MAX_ODD_LOG; // <= 0
        const logLowRelative = HYPERGEO_LOW_LOG[lowCount] - MAX_LOW_LOG; // <= 0
        const logParityRelative = 0.5 * (logOddRelative + logLowRelative); // range: [-2.5, 0]

        // [4. Combinatorial Consecutive & Terminal Digit Penalties]
        let consecCount = 0;
        let maxConsec = 1;
        let curConsec = 1;
        for (let i = 1; i < 6; i++) {
          if (nums[i] === nums[i - 1] + 1) {
            consecCount++;
            curConsec++;
            if (curConsec > maxConsec) maxConsec = curConsec;
          } else {
            curConsec = 1;
          }
        }
        if (maxConsec >= 4) return 55.0; // strictly rejected
        const consecPenalty = consecCount > 1 ? (consecCount - 1) * 1.5 : 0;

        const endCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < 6; i++) endCounts[nums[i] % 10]++;
        let maxEnd = 0;
        for (let i = 0; i < 10; i++) if (endCounts[i] > maxEnd) maxEnd = endCounts[i];
        if (maxEnd >= 4) return 55.0; // strictly rejected
        const endPenalty = maxEnd === 3 ? 0.6 : 0;

        // [5. Mean Pairwise Lift (15 pairs)]
        let liftSum = 0;
        const liftMatrix = snap.liftMatrix;
        if (liftMatrix) {
          for (let i = 0; i < 6; i++) {
            const row = liftMatrix[nums[i]];
            for (let j = i + 1; j < 6; j++) {
              liftSum += row[nums[j]];
            }
          }
        }
        const meanLift = liftSum / 15; // expected theoretical mean ~ 1.0

        // Count recent hot numbers
        let hotCount = 0;
        const hotSet = snap.recentHotSet;
        if (hotSet) {
          for (let i = 0; i < 6; i++) if (hotSet.has(nums[i])) hotCount++;
        }

        let Z = 0;

        if (track === "A") {
          // [Track A: Equilibrium & Pro-Trend Joint Objective]
          // Hot count optimal at 2~3 (Gaussian peak around 2.5)
          const hotDev = hotCount - 2.5;
          const hotGaussian = Math.exp(-(hotDev * hotDev) / 2.0);

          Z = 1.8 * logSumDensity +
              1.5 * logParityRelative +
              2.2 * (meanLift - 1.0) +
              1.8 * (hotGaussian - 0.5) -
              consecPenalty -
              endPenalty;
        } else {
          // [Track B: Contrarian & Anti-Crowding (Split-Jackpot Avoidance)]
          // 1) Historical win collision
          const winKey = nums.join(",");
          if (snap.pastWinsMap && snap.pastWinsMap.has(winKey)) return 50.0;

          // 2) 5-match overlap with recent 100 draws via bitmask
          let overlapPenalty = 0;
          if (snap.recentWinsMasks && snap.recentWinsMasks.length > 0) {
            const candMask = (1n << BigInt(nums[0])) | (1n << BigInt(nums[1])) |
                             (1n << BigInt(nums[2])) | (1n << BigInt(nums[3])) |
                             (1n << BigInt(nums[4])) | (1n << BigInt(nums[5]));
            const masks = snap.recentWinsMasks;
            for (let k = 0; k < masks.length; k++) {
              let inter = candMask & masks[k];
              let match = 0;
              while (inter > 0n) {
                inter &= (inter - 1n);
                match++;
                if (match >= 5) break;
              }
              if (match >= 5) {
                overlapPenalty = 4.0;
                break;
              } else if (match === 4 && overlapPenalty < 0.8) {
                overlapPenalty = 0.8;
              }
            }
          }

          // 3) Fresh pairs (meanLift < 1.0 preferred)
          const freshPairScore = (1.0 - meanLift) * 2.0;

          // 4) Suppress hot numbers (0 or 1 preferred)
          const hotPenalty = hotCount > 1 ? Math.pow(hotCount - 1, 1.3) * 1.2 : 0;

          Z = 1.5 * logSumDensity +
              1.2 * logParityRelative +
              freshPairScore -
              hotPenalty -
              overlapPenalty -
              consecPenalty -
              endPenalty;
        }

        // [6. Calibrated Deterministic Sigmoid Mapping to [88.0, 99.4]]
        // Zero artificial noise! Smooth continuous Float64 ensures uniqueness without ties.
        const S_min = 88.0;
        const S_max = 99.4;
        const k_sig = 1.35;
        const Z_0 = -0.6;
        const sigmoid = 1.0 / (1.0 + Math.exp(-k_sig * (Z - Z_0)));
        const finalScore = S_min + (S_max - S_min) * sigmoid;

        return parseFloat(finalScore.toFixed(2));
      }

      async simulateAsync(track, totalSimulations, onProgress) {
        const snap = this.snapshot();
        const topPool = [];
        const chunkSize = 25000;
        let processed = 0;

        const startTime = performance.now();
        const used = new Uint8Array(47);
        const nums = new Array(6);

        while (processed < totalSimulations) {
          const currentChunk = Math.min(chunkSize, totalSimulations - processed);
          const minThreshold = topPool.length >= 30 ? topPool[topPool.length - 1].fit : 0;

          for (let i = 0; i < currentChunk; i++) {
            let count = 0;
            while (count < 6) {
              const r = (Math.random() * 45 | 0) + 1;
              if (!used[r]) {
                used[r] = 1;
                nums[count++] = r;
              }
            }
            for (let j = 0; j < 6; j++) used[nums[j]] = 0;
            nums.sort((a, b) => a - b);

            const fit = this.calculateFit(nums, track, snap, minThreshold);

            if (topPool.length < 30 || fit > topPool[topPool.length - 1].fit) {
              const key = nums.join(",");
              if (!topPool.some((x) => x.key === key)) {
                topPool.push({ nums: [...nums], fit, key });
                topPool.sort((a, b) => b.fit - a.fit);
                if (topPool.length > 30) topPool.pop();
              }
            }
          }

          processed += currentChunk;

          if (onProgress) {
            const elapsedSec = (performance.now() - startTime) / 1000 || 0.001;
            const opsPerSec = Math.round(processed / elapsedSec);
            const bestFit = topPool.length > 0 ? topPool[0].fit : 88.0;

            onProgress({
              processed,
              total: totalSimulations,
              opsPerSec,
              bestFit,
            });
          }

          await new Promise((r) => setTimeout(r, 0));
        }

        return topPool.slice(0, 5).map(({ nums, fit }) => ({ nums, fit }));
      }

      ensembleCompress(candidatePool, track, snap) {
        const posCounts = Array.from({ length: 6 }, () => ({}));
        const totalCounts = {};

        candidatePool.forEach((cand) => {
          cand.nums.forEach((num, pos) => {
            posCounts[pos][num] = (posCounts[pos][num] || 0) + 1;
            totalCounts[num] = (totalCounts[num] || 0) + 1;
          });
        });

        // 각 자리별 출현 빈도 내림차순 정렬
        const rankedByPos = posCounts.map((pMap) => {
          return Object.keys(pMap)
            .map((k) => Number(k))
            .sort((a, b) => {
              const diff = pMap[b] - pMap[a];
              if (diff !== 0) return diff;
              return (totalCounts[b] || 0) - (totalCounts[a] || 0) || a - b;
            });
        });

        // 전체 후보군 중 최다 중복(겹침) 번호 순위
        const allRanked = Object.keys(totalCounts)
          .map((k) => Number(k))
          .sort((a, b) => (totalCounts[b] - totalCounts[a]) || a - b);

        // 상위 겹침 앵커 번호군 (상위 8개)
        const topAnchors = allRanked.slice(0, 8);

        // 5개 조합 조립 (상위 앵커 번호들을 2~3개씩 교차 겹침 배치)
        const anchorPatterns = [
          [0, 1, 2],       // Combo 1: 1, 2, 3위 앵커
          [0, 2, 3],       // Combo 2: 1, 3, 4위 앵커 (0번과 2번 겹침)
          [1, 3, 4],       // Combo 3: 2, 4, 5위 앵커 (1번과 3번 겹침)
          [0, 1, 4],       // Combo 4: 1, 2, 5위 앵커 (0번과 1번 겹침)
          [2, 4, 5],       // Combo 5: 3, 5, 6위 앵커 (2번과 4번 겹침)
        ];

        const results = [];
        const seenCombinations = new Set();

        for (let k = 0; k < 5; k++) {
          const chosen = new Set();
          const p = anchorPatterns[k % anchorPatterns.length];

          // 1) 겹침 앵커 번호 3개 우선 투입
          p.forEach((idx) => {
            if (topAnchors[idx] != null && !chosen.has(topAnchors[idx])) {
              chosen.add(topAnchors[idx]);
            }
          });

          // 2) 각 자리별 후보 번호들로 채우기 (k 오프셋으로 다양한 조합 구성)
          for (let pos = 0; pos < 6 && chosen.size < 6; pos++) {
            const candidates = rankedByPos[pos] || [];
            for (let rankIdx = k; rankIdx < candidates.length; rankIdx++) {
              const num = candidates[rankIdx];
              if (!chosen.has(num)) {
                chosen.add(num);
                break;
              }
            }
            if (chosen.size < 6) {
              for (let rankIdx = 0; rankIdx < candidates.length; rankIdx++) {
                const num = candidates[rankIdx];
                if (!chosen.has(num)) {
                  chosen.add(num);
                  break;
                }
              }
            }
          }

          // 3) 부족할 경우 전체 빈도 순으로 보충
          if (chosen.size < 6) {
            for (let num of allRanked) {
              if (!chosen.has(num)) {
                chosen.add(num);
                if (chosen.size === 6) break;
              }
            }
          }

          // 4) 45까지 풀에서 안전 보충
          for (let num = 1; num <= 45 && chosen.size < 6; num++) {
            chosen.add(num);
          }

          const finalNums = Array.from(chosen).sort((a, b) => a - b);
          const comboKey = finalNums.join(",");
          if (!seenCombinations.has(comboKey) && finalNums.length === 6) {
            seenCombinations.add(comboKey);
            const fit = this.calculateFit(finalNums, track, snap);
            results.push({ nums: finalNums, fit });
          }
        }

        // 혹시 5개 미만인 경우 추가 생성 (서로 다른 조합 보장)
        let fallbackIdx = 0;
        while (results.length < 5 && fallbackIdx < 40) {
          const chosen = new Set();
          chosen.add(topAnchors[fallbackIdx % topAnchors.length]);
          chosen.add(topAnchors[(fallbackIdx + 2) % topAnchors.length]);
          for (let i = fallbackIdx; i < allRanked.length && chosen.size < 6; i++) {
            if (!chosen.has(allRanked[i])) chosen.add(allRanked[i]);
          }
          for (let num = 1; num <= 45 && chosen.size < 6; num++) {
            chosen.add(num);
          }
          const finalNums = Array.from(chosen).sort((a, b) => a - b);
          const comboKey = finalNums.join(",");
          if (!seenCombinations.has(comboKey) && finalNums.length === 6) {
            seenCombinations.add(comboKey);
            const fit = this.calculateFit(finalNums, track, snap);
            results.push({ nums: finalNums, fit });
          }
          fallbackIdx++;
        }

        results.sort((a, b) => b.fit - a.fit);

        // 최다 겹침 핵심 번호 메타데이터
        results.consensus = allRanked.slice(0, 6).map((n) => ({
          n,
          count: totalCounts[n] || 0,
        }));

        return results;
      }

      async runEnsembleSimulations(track, perRoundSimulations, onProgress) {
        const snap = this.snapshot();
        const totalRounds = 30; // 30회차 수렴 연산 (150개 정예 후보 축적)
        const candidatePool = [];
        let totalProcessed = 0;
        const totalSimulations = perRoundSimulations * totalRounds;
        const startTime = performance.now();

        for (let round = 0; round < totalRounds; round++) {
          const roundTop = await this.simulateAsync(track, perRoundSimulations, (p) => {
            const currentProcessed = totalProcessed + p.processed;
            const elapsedSec = (performance.now() - startTime) / 1000 || 0.001;
            const opsPerSec = Math.round(currentProcessed / elapsedSec);

            // 실시간 수렴 집중도 계산
            const poolLen = candidatePool.length;
            const convRatio = Math.min(98, Math.max(12, Math.round((round / totalRounds) * 75 + (p.processed / perRoundSimulations) * 20)));

            if (onProgress) {
              onProgress({
                round: round + 1,
                totalRounds,
                roundProcessed: p.processed,
                totalProcessed: currentProcessed,
                totalSimulations,
                opsPerSec,
                bestFit: p.bestFit,
                poolSize: poolLen,
                convergence: convRatio,
                stage: "simulate",
              });
            }
          });

          candidatePool.push(...roundTop);
          totalProcessed += perRoundSimulations;
        }

        if (onProgress) {
          onProgress({
            round: totalRounds,
            totalRounds,
            roundProcessed: perRoundSimulations,
            totalProcessed,
            totalSimulations,
            opsPerSec: 0,
            bestFit: candidatePool[0]?.fit || 90.0,
            poolSize: candidatePool.length,
            convergence: 98,
            stage: "compress",
          });
        }

        return this.ensembleCompress(candidatePool, track, snap);
      }

      generate(track, count) {
        const snap = this.snapshot();
        const res = [];
        for (let i = 0; i < count; i++) {
          const set = new Set();
          while (set.size < 6) {
            set.add(Math.floor(Math.random() * 45) + 1);
          }
          const nums = [...set].sort((a, b) => a - b);
          const fit = this.calculateFit(nums, track, snap);
          res.push({ nums, fit });
        }
        return res.sort((a, b) => b.fit - a.fit).slice(0, 5);
      }
    },
    PensionEngine: class {
      constructor(list) {
        this.list = list;
      }
      snapshot() {
        const list = this.list;
        const last = list[list.length - 1] || { round: "0", group: "1", digits: ["0", "0", "0", "0", "0", "0"] };
        const gFreqs = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const posF = Array.from({ length: 6 }, () => Array(10).fill(0));
        const pastWinsMap = new Map();

        list.forEach((item) => {
          const g = parseInt(item.group, 10);
          if (gFreqs[g] !== undefined) gFreqs[g]++;
          const codeStr = Array.isArray(item.digits) ? item.digits.join("") : String(item.digits);
          const winKey = `${g}_${codeStr}`;
          pastWinsMap.set(winKey, (pastWinsMap.get(winKey) || 0) + 1);

          if (Array.isArray(item.digits)) {
            item.digits.forEach((d, pos) => {
              const digit = parseInt(d, 10);
              if (!isNaN(digit) && pos < 6) posF[pos][digit]++;
            });
          }
        });

        const groups = [1, 2, 3, 4, 5].map((g) => ({ g, freq: gFreqs[g] }));
        const sortedGroups = [...groups].sort((a, b) => b.freq - a.freq);
        const hotGroup = sortedGroups[0].g;
        const coldGroup = sortedGroups[sortedGroups.length - 1].g;

        const recentWins = list
          .slice(-50)
          .map((item) => `${item.group}_${Array.isArray(item.digits) ? item.digits.join("") : item.digits}`);
        const recent50Last4Set = new Set(recentWins.map((w) => w.slice(-4)));

        return {
          last: {
            round: cleanPureDigits(last.round),
            group: cleanPureDigits(last.group),
            digits: Array.isArray(last.digits) ? last.digits.join("") : last.digits,
            date: "",
          },
          n: list.length,
          groups,
          posF,
          cluster: [1, 3, 7],
          hotGroup,
          coldGroup,
          pastWinsMap,
          recentWins,
          recent50Last4Set,
        };
      }

      calculateFit(group, codeDigits, track, snap) {
        const d0 = codeDigits[0], d1 = codeDigits[1], d2 = codeDigits[2],
              d3 = codeDigits[3], d4 = codeDigits[4], d5 = codeDigits[5];

        // [1. Early-Exit Rejection for Extreme Degeneracy]
        const sum = d0 + d1 + d2 + d3 + d4 + d5;
        if (sum < 8 || sum > 46) return 60.0;

        const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        counts[d0]++; counts[d1]++; counts[d2]++;
        counts[d3]++; counts[d4]++; counts[d5]++;

        let maxCount = 0;
        let oddCount = 0;
        for (let i = 0; i < 10; i++) {
          const c = counts[i];
          if (c > maxCount) maxCount = c;
          if (i & 1) oddCount += c;
        }
        if (maxCount >= 5) return 55.0; // 5+ identical digits strictly rejected

        // [2. Gaussian Sum Fitness: mu=27.0, sigma=7.0356, 2*sigma^2 = 99.0]
        const devS = sum - 27;
        const f_sum = Math.exp(-(devS * devS) / 99.0); // range [0, 1]

        // [3. Digit Multiplicity & Shannon Entropy via O(1) C_LOG2_C]
        let clogcSum = 0;
        for (let i = 0; i < 10; i++) {
          clogcSum += C_LOG2_C[counts[i]];
        }
        const entropy = MAX_PENSION_ENTROPY - (clogcSum / 6.0);
        const normEntropy = entropy / MAX_PENSION_ENTROPY; // range [0, 1]

        // [4. Odd/Even Binomial Likelihood Ratio: B(6, 0.5)]
        const parityRatio = BINOM_ODD_RATIO[oddCount]; // range [0.05, 1.0]

        // [5. Sequential Step-Wise Deltas & Continuous Variance]
        const delta0 = d1 - d0, delta1 = d2 - d1, delta2 = d3 - d2,
              delta3 = d4 - d3, delta4 = d5 - d4;

        let isStrictLinear = false;
        if (delta0 === delta1 && delta1 === delta2 && delta2 === delta3 && delta3 === delta4) {
          isStrictLinear = true;
          if (delta0 === 0) return 55.0;
        }

        const meanDelta = (d5 - d0) / 5;
        const diff0 = delta0 - meanDelta, diff1 = delta1 - meanDelta, diff2 = delta2 - meanDelta,
              diff3 = delta3 - meanDelta, diff4 = delta4 - meanDelta;
        const varDelta = (diff0*diff0 + diff1*diff1 + diff2*diff2 + diff3*diff3 + diff4*diff4) / 5;
        const normVarDelta = Math.log1p(varDelta) / 3.258; // smooth log1p mapping without hard clipping

        let Z = 0;

        if (track === "A") {
          // [Track A: Canonical Equilibrium]
          let scoreA = 2.5 * f_sum +
                       2.8 * normEntropy +
                       1.6 * parityRatio +
                       1.2 * normVarDelta;

          if (isStrictLinear) scoreA -= 2.0;
          if (maxCount === 4) scoreA -= 1.2;

          Z = scoreA;
        } else {
          // [Track B: Contrarian & Anti-Crowding (Split-Prize Avoidance)]
          const codeStr = `${d0}${d1}${d2}${d3}${d4}${d5}`;
          const winKey = `${group}_${codeStr}`;
          if (snap && snap.pastWinsMap && snap.pastWinsMap.has(winKey)) return 50.0;

          let penalty = 0;
          // Substring collision: Terminal 4 digits with recent 50 draws
          const last4 = codeStr.slice(-4);
          if (snap && snap.recent50Last4Set && snap.recent50Last4Set.has(last4)) penalty += 2.0;

          // Palindrome check: e.g. 123321
          if (d0 === d5 && d1 === d4 && d2 === d3) penalty += 2.5;

          // Repeating triplets check: e.g. 123123
          if (d0 === d3 && d1 === d4 && d2 === d5) penalty += 2.5;

          // Degenerate linear sequence
          if (isStrictLinear) penalty += 2.5;

          // MM-DD-YY date format bias
          const mm = d0 * 10 + d1;
          const dd = d2 * 10 + d3;
          if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) penalty += 0.8;

          let scoreB = 2.0 * f_sum +
                       3.0 * normEntropy +
                       1.4 * parityRatio +
                       1.2 * normVarDelta -
                       penalty;

          if (maxCount === 4) scoreB -= 1.5;

          Z = scoreB;
        }

        // [6. Deterministic Sigmoid Mapping to [88.0, 99.4]]
        // Zero artificial random noise! Purely deterministic continuous probability mapping.
        const S_min = 88.0;
        const S_max = 99.4;
        const k_sig = 1.15;
        const Z_0 = 5.6;
        const sigmoid = 1.0 / (1.0 + Math.exp(-k_sig * (Z - Z_0)));
        const finalScore = S_min + (S_max - S_min) * sigmoid;

        return parseFloat(finalScore.toFixed(2));
      }

      async simulateAsync(track, totalSimulations, onProgress) {
        const snap = this.snapshot();
        const topPool = [];
        const chunkSize = 25000;
        let processed = 0;

        const startTime = performance.now();
        const codeArr = new Array(6);

        while (processed < totalSimulations) {
          const currentChunk = Math.min(chunkSize, totalSimulations - processed);

          for (let i = 0; i < currentChunk; i++) {
            const group = (Math.random() * 5 | 0) + 1;
            for (let j = 0; j < 6; j++) {
              codeArr[j] = (Math.random() * 10 | 0);
            }
            const fit = this.calculateFit(group, codeArr, track, snap);

            if (topPool.length < 30 || fit > topPool[topPool.length - 1].fit) {
              const code = codeArr.join("");
              const key = `${group}_${code}`;
              if (!topPool.some((x) => x.key === key)) {
                topPool.push({ group, code, fit, key });
                topPool.sort((a, b) => b.fit - a.fit);
                if (topPool.length > 30) topPool.pop();
              }
            }
          }

          processed += currentChunk;

          if (onProgress) {
            const elapsedSec = (performance.now() - startTime) / 1000 || 0.001;
            const opsPerSec = Math.round(processed / elapsedSec);
            const bestFit = topPool.length > 0 ? topPool[0].fit : 88.5;

            onProgress({
              processed,
              total: totalSimulations,
              opsPerSec,
              bestFit,
            });
          }

          await new Promise((r) => setTimeout(r, 0));
        }

        return topPool.slice(0, 5).map(({ group, code, fit }) => ({ group, code, fit }));
      }

      ensembleCompress(candidatePool, track, snap) {
        // candidatePool: 150개 객체 { group: 1~5, code: '123456', fit: float }
        const groupCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        const posCounts = Array.from({ length: 6 }, () => Array(10).fill(0));

        candidatePool.forEach((cand) => {
          const g = Number(cand.group);
          if (groupCounts[g] !== undefined) groupCounts[g]++;

          const digits = String(cand.code).split("");
          digits.forEach((d, pos) => {
            const digit = Number(d);
            if (!isNaN(digit) && pos < 6) posCounts[pos][digit]++;
          });
        });

        // 조 순위 (빈도 내림차순)
        const rankedGroups = [1, 2, 3, 4, 5].sort((a, b) => {
          return (groupCounts[b] - groupCounts[a]) || (a - b);
        });

        // 자릿수별 순위 (0~9 빈도 내림차순)
        const rankedDigitsByPos = posCounts.map((counts) => {
          return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort((a, b) => {
            return (counts[b] - counts[a]) || (a - b);
          });
        });

        // 자리별 최다 겹침 앵커 숫자들
        const primaryAnchorDigits = rankedDigitsByPos.map((dList) => dList[0]);
        const secondaryAnchorDigits = rankedDigitsByPos.map((dList) => dList[1] ?? dList[0]);

        // 5개 조합 생성 (자리별 겹침을 확연히 체감할 수 있도록 앵커 숫자들을 3~4자리씩 공통 공유)
        const results = [];
        const seenCodes = new Set();

        // 앵커 공유 마스크: 어떤 자리를 최빈 1위 숫자로 고정할 것인가
        const anchorMasks = [
          [true, true, true, false, false, true],  // 1, 2, 3, 6번째 자리 겹침
          [true, false, true, true, false, true],  // 1, 3, 4, 6번째 자리 겹침
          [false, true, true, false, true, true],  // 2, 3, 5, 6번째 자리 겹침
          [true, true, false, true, true, false],  // 1, 2, 4, 5번째 자리 겹침
          [true, false, true, false, true, true],  // 1, 3, 5, 6번째 자리 겹침
        ];

        for (let k = 0; k < 5; k++) {
          const group = rankedGroups[k % 2]; // 상위 1, 2위 최다 겹침 조 위주 배정
          const mask = anchorMasks[k % anchorMasks.length];
          const codeArr = [];

          for (let pos = 0; pos < 6; pos++) {
            if (mask[pos]) {
              codeArr.push(primaryAnchorDigits[pos]); // 1위 최빈수 겹침
            } else {
              // 2위 또는 k순위 빈도수 배치
              const candDigits = rankedDigitsByPos[pos];
              const pick = candDigits[(k + 1) % candDigits.length];
              codeArr.push(pick);
            }
          }

          const code = codeArr.join("");
          const fullKey = `${group}_${code}`;
          if (!seenCodes.has(fullKey)) {
            seenCodes.add(fullKey);
            const fit = this.calculateFit(group, codeArr, track, snap);
            results.push({ group, code, fit });
          }
        }

        // 혹시 5개 미만인 경우 보충 (서로 다른 조합 보장)
        let fallback = 0;
        while (results.length < 5 && fallback < 40) {
          const group = rankedGroups[fallback % rankedGroups.length];
          const codeArr = [];
          for (let pos = 0; pos < 6; pos++) {
            const candDigits = rankedDigitsByPos[pos];
            codeArr.push(candDigits[(fallback + pos) % candDigits.length]);
          }
          const code = codeArr.join("");
          const fullKey = `${group}_${code}`;
          if (!seenCodes.has(fullKey)) {
            seenCodes.add(fullKey);
            const fit = this.calculateFit(group, codeArr, track, snap);
            results.push({ group, code, fit });
          }
          fallback++;
        }

        results.sort((a, b) => b.fit - a.fit);

        // 연금복권 최다 겹침 자리별 앵커 메타데이터
        results.consensus = rankedDigitsByPos.map((dList, pos) => ({
          pos: pos + 1,
          digit: dList[0],
          count: posCounts[pos][dList[0]] || 0,
        }));

        return results;
      }

      async runEnsembleSimulations(track, perRoundSimulations, onProgress) {
        const snap = this.snapshot();
        const totalRounds = 30; // 30회차 수렴 연산 (150개 정예 후보 축적)
        const candidatePool = [];
        let totalProcessed = 0;
        const totalSimulations = perRoundSimulations * totalRounds;
        const startTime = performance.now();

        for (let round = 0; round < totalRounds; round++) {
          const roundTop = await this.simulateAsync(track, perRoundSimulations, (p) => {
            const currentProcessed = totalProcessed + p.processed;
            const elapsedSec = (performance.now() - startTime) / 1000 || 0.001;
            const opsPerSec = Math.round(currentProcessed / elapsedSec);

            // 실시간 수렴 집중도 계산
            const poolLen = candidatePool.length;
            const convRatio = Math.min(98, Math.max(12, Math.round((round / totalRounds) * 75 + (p.processed / perRoundSimulations) * 20)));

            if (onProgress) {
              onProgress({
                round: round + 1,
                totalRounds,
                roundProcessed: p.processed,
                totalProcessed: currentProcessed,
                totalSimulations,
                opsPerSec,
                bestFit: p.bestFit,
                poolSize: poolLen,
                convergence: convRatio,
                stage: "simulate",
              });
            }
          });

          candidatePool.push(...roundTop);
          totalProcessed += perRoundSimulations;
        }

        if (onProgress) {
          onProgress({
            round: totalRounds,
            totalRounds,
            roundProcessed: perRoundSimulations,
            totalProcessed,
            totalSimulations,
            opsPerSec: 0,
            bestFit: candidatePool[0]?.fit || 88.5,
            poolSize: candidatePool.length,
            convergence: 98,
            stage: "compress",
          });
        }

        return this.ensembleCompress(candidatePool, track, snap);
      }

      generate(track, count) {
        const snap = this.snapshot();
        const res = [];
        for (let i = 0; i < count; i++) {
          const group = Math.floor(Math.random() * 5) + 1;
          const codeArr = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));
          const code = codeArr.join("");
          const fit = this.calculateFit(group, codeArr, track, snap);
          res.push({ group, code, fit });
        }
        return res.sort((a, b) => b.fit - a.fit).slice(0, 5);
      }
    },
  };

  const PICKTOInsight = {
    lotto: (track, combos, snap) =>
      track === "A"
        ? "최근 상위 빈도 번호 조합을 기반으로 기본 추첨 방식으로 추출했습니다."
        : "장기 미출현 및 하위 빈도 번호를 조합하여 통계 제외 추첨 방식으로 추출했습니다.",
    pension: (track, combos, snap) =>
      track === "A"
        ? "과열 조 및 각 자리별 최빈 숫자의 가중치를 반영하여 기본 추첨 방식으로 조합을 구성했습니다."
        : "과열 번호를 제외하고 균등 출현 가능성이 있는 숫자로 통계 제외 추첨 방식을 구성했습니다.",
  };

function buildReportPayload(mode, which, lottoRes, pensionRes, snapL, snapP) {
    const trackCode = which === "A" ? "default" : which === "B" ? "exclude_stats" : "both";

    const payload = {
      meta: {
        mode, // "lotto" | "pension" | "all"
        track: trackCode, // "default" | "exclude_stats" | "both"
        timestamp: Date.now(),
      },
      results: {},
      context: {},
    };

    if (mode === "lotto" || mode === "all") {
      const lottoResults = {};
      if (lottoRes && lottoRes.A) {
        lottoResults.A = lottoRes.A.map((combo) => ({
          nums: combo.nums,
          fitScore: combo.fit,
          details: combo.nums.map((num) => {
            const item = snapL ? snapL.all.find((x) => x.n === num) : null;
            return { number: num, frequency: item ? item.freq : 0, gapRounds: item ? item.gap : 0, isHotCluster: item ? item.inCluster : false };
          }),
        }));
      }
      if (lottoRes && lottoRes.B) {
        lottoResults.B = lottoRes.B.map((combo) => ({
          nums: combo.nums,
          fitScore: combo.fit,
          details: combo.nums.map((num) => {
            const item = snapL ? snapL.all.find((x) => x.n === num) : null;
            return { number: num, frequency: item ? item.freq : 0, gapRounds: item ? item.gap : 0, isHotCluster: item ? item.inCluster : false };
          }),
        }));
      }
      if (mode === "lotto") {
        payload.results = lottoResults;
        payload.context = {
          hotCluster: snapL ? snapL.cluster.map((c) => c.n) : [],
          overdueTop: snapL ? snapL.overdue.map((o) => ({ number: o.n, gapRounds: o.gap })) : [],
        };
      } else {
        payload.results.lotto = lottoResults;
        payload.context.lotto = {
          hotCluster: snapL ? snapL.cluster.map((c) => c.n) : [],
          overdueTop: snapL ? snapL.overdue.map((o) => ({ number: o.n, gapRounds: o.gap })) : [],
        };
      }
    }

    if (mode === "pension" || mode === "all") {
      const pensionResults = {};
      if (pensionRes && pensionRes.A) {
        pensionResults.A = pensionRes.A.map((combo) => {
          const digits = String(combo.code).split("");
          return {
            group: combo.group,
            code: combo.code,
            digits,
            fitScore: combo.fit,
            positionDetails: digits.map((d, idx) => ({
              position: idx + 1,
              digit: Number(d),
              posFrequency: snapP && snapP.posF && snapP.posF[idx] ? snapP.posF[idx][Number(d)] : 0,
            })),
          };
        });
      }
      if (pensionRes && pensionRes.B) {
        pensionResults.B = pensionRes.B.map((combo) => {
          const digits = String(combo.code).split("");
          return {
            group: combo.group,
            code: combo.code,
            digits,
            fitScore: combo.fit,
            positionDetails: digits.map((d, idx) => ({
              position: idx + 1,
              digit: Number(d),
              posFrequency: snapP && snapP.posF && snapP.posF[idx] ? snapP.posF[idx][Number(d)] : 0,
            })),
          };
        });
      }
      if (mode === "pension") {
        payload.results = pensionResults;
        payload.context = {
          hotGroup: snapP ? snapP.hotGroup : 1,
          hotClusterDigits: snapP ? snapP.cluster : [],
        };
      } else {
        payload.results.pension = pensionResults;
        payload.context.pension = {
          hotGroup: snapP ? snapP.hotGroup : 1,
          hotClusterDigits: snapP ? snapP.cluster : [],
        };
      }
    }

    return payload;
  }

  // Static hosting: reports are computed locally; no input is posted to a server.
  async function requestStatisticsReport(payload) {
    const label={lotto:'로또 6/45',pension:'연금복권 720+',all:'로또와 연금복권'}[payload.meta.mode]||'번호';
    return {success:true,report:label+' 조합을 저장된 추첨 데이터와 선택한 통계 필터를 기준으로 만들었어요.\n표시된 적합도는 필터와의 일치도를 나타내며, 당첨 가능성이나 예측 정확도가 아니에요.\n반복 시뮬레이션은 조합을 탐색하는 방법이며 미래 추첨 결과를 보장하지 않아요.'};
  }

  function analyzeUserLotto(nums, lottoEngine, snap) {
    if (!lottoEngine || !snap) return null;
    const sorted = [...nums].sort((a, b) => a - b);
    const scoreA = lottoEngine.calculateFit(sorted, "A", snap);
    const scoreB = lottoEngine.calculateFit(sorted, "B", snap);

    const sum = sorted.reduce((a, b) => a + b, 0);
    let oddCount = 0;
    let lowCount = 0;
    for (let i = 0; i < 6; i++) {
      if (sorted[i] & 1) oddCount++;
      if (sorted[i] <= 22) lowCount++;
    }

    // Mean Lift
    let liftSum = 0;
    const liftMatrix = snap.liftMatrix;
    if (liftMatrix) {
      for (let i = 0; i < 6; i++) {
        const row = liftMatrix[sorted[i]];
        for (let j = i + 1; j < 6; j++) {
          liftSum += row[sorted[j]] || 0;
        }
      }
    }
    const meanLift = parseFloat((liftSum / 15).toFixed(3));

    // Hot count & Overdue count
    let hotCount = 0;
    const hotSet = snap.recentHotSet;
    if (hotSet) {
      for (let i = 0; i < 6; i++) if (hotSet.has(sorted[i])) hotCount++;
    }

    let overdueCount = 0;
    const overdueSet = snap.overdueSet;
    if (overdueSet) {
      for (let i = 0; i < 6; i++) if (overdueSet.has(sorted[i])) overdueCount++;
    }

    // Historical win check
    const key = sorted.join(",");
    const isHistoricalWin = Boolean(snap.pastWinsMap && snap.pastWinsMap.has(key));

    // Recent 100 max overlap
    let maxOverlap = 0;
    if (snap.recentWinsMasks && snap.recentWinsMasks.length > 0) {
      const candMask = (1n << BigInt(sorted[0])) | (1n << BigInt(sorted[1])) |
                       (1n << BigInt(sorted[2])) | (1n << BigInt(sorted[3])) |
                       (1n << BigInt(sorted[4])) | (1n << BigInt(sorted[5]));
      for (let k = 0; k < snap.recentWinsMasks.length; k++) {
        let inter = candMask & snap.recentWinsMasks[k];
        let match = 0;
        while (inter > 0n) {
          inter &= (inter - 1n);
          match++;
        }
        if (match > maxOverlap) maxOverlap = match;
      }
    }

    return {
      nums: sorted,
      scoreA,
      scoreB,
      sum,
      sumDiff: sum - 138,
      oddCount,
      evenCount: 6 - oddCount,
      lowCount,
      highCount: 6 - lowCount,
      meanLift,
      hotCount,
      overdueCount,
      isHistoricalWin,
      maxOverlap,
    };
  }

  function analyzeUserPension(codeDigits, pensionEngine, snap) {
    if (!pensionEngine || !snap) return null;
    const digits = [...codeDigits];
    const d0 = digits[0], d1 = digits[1], d2 = digits[2],
          d3 = digits[3], d4 = digits[4], d5 = digits[5];

    // Evaluate without group bias (group = 1)
    const scoreA = pensionEngine.calculateFit(1, digits, "A", snap);
    const scoreB = pensionEngine.calculateFit(1, digits, "B", snap);

    const sum = d0 + d1 + d2 + d3 + d4 + d5;

    // Counts & Entropy
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6; i++) counts[digits[i]]++;
    let uniqueCount = 0;
    let clogcSum = 0;
    let oddCount = 0;
    for (let i = 0; i < 10; i++) {
      if (counts[i] > 0) uniqueCount++;
      clogcSum += C_LOG2_C[counts[i]];
      if (i & 1) oddCount += counts[i];
    }
    const entropy = parseFloat((MAX_PENSION_ENTROPY - (clogcSum / 6.0)).toFixed(3));

    // Sequential delta variance
    const delta0 = d1 - d0, delta1 = d2 - d1, delta2 = d3 - d2,
          delta3 = d4 - d3, delta4 = d5 - d4;
    const meanDelta = (d5 - d0) / 5;
    const diff0 = delta0 - meanDelta, diff1 = delta1 - meanDelta, diff2 = delta2 - meanDelta,
          diff3 = delta3 - meanDelta, diff4 = delta4 - meanDelta;
    const varDelta = parseFloat(((diff0*diff0 + diff1*diff1 + diff2*diff2 + diff3*diff3 + diff4*diff4) / 5).toFixed(2));

    const codeStr = digits.join("");
    let isHistoricalWin = false;
    if (snap.pastWinsMap) {
      for (let g = 1; g <= 5; g++) {
        if (snap.pastWinsMap.has(`${g}_${codeStr}`)) {
          isHistoricalWin = true;
          break;
        }
      }
    }

    const isLast4Collision = Boolean(snap.recent50Last4Set && snap.recent50Last4Set.has(codeStr.slice(-4)));
    const isPalindrome = d0 === d5 && d1 === d4 && d2 === d3;
    const isTripletRepeat = d0 === d3 && d1 === d4 && d2 === d5;
    const isLinear = delta0 === delta1 && delta1 === delta2 && delta2 === delta3 && delta3 === delta4;

    return {
      digits,
      codeStr,
      scoreA,
      scoreB,
      sum,
      sumDiff: sum - 27,
      entropy,
      uniqueCount,
      oddCount,
      evenCount: 6 - oddCount,
      varDelta,
      isHistoricalWin,
      isLast4Collision,
      isPalindrome,
      isTripletRepeat,
      isLinear,
    };
  }

  exports.engine = {
    fetchCSVData,
    parseLottoCSV,
    parsePensionCSV,
    validateLottoData,
    validatePensionData,
    buildReportPayload,
    requestStatisticsReport,
    analyzeUserLotto,
    analyzeUserPension,
    PICKTOEngine,
    PICKTOInsight,
  };
})(window.PICKO);

;
window.PICKO = window.PICKO || {};

(function (exports) {
  const { $, cleanPureDigits, ballsHtml, fmtDate, getLottoDate, getPensionDate } = exports.utils;

  function renderHome(state) {
    if (!state.snapL || !state.snapP) return;

    const snapL = state.snapL;
    const snapP = state.snapP;
    const lastLotto = snapL.last;
    const lastPension = snapP.last;

    // Render Lotto 6/45 card
    const lastMetaEl = $("#last-meta");
    if (lastMetaEl) {
      const dateStr = lastLotto.date ? fmtDate(lastLotto.date) : getLottoDate(lastLotto.round);
      lastMetaEl.innerHTML = `<b>${cleanPureDigits(lastLotto.round)}회</b><span>${dateStr} 추첨</span>`;
    }

    const lastBallsEl = $("#last-balls");
    if (lastBallsEl) {
      lastBallsEl.innerHTML = ballsHtml(lastLotto.nums, lastLotto.bonus);
    }

    // Render Pension 720+ card
    const lastPensionMetaEl = $("#last-pension-meta");
    if (lastPensionMetaEl) {
      const dateStr = lastPension.date ? fmtDate(lastPension.date) : getPensionDate(lastPension.round);
      lastPensionMetaEl.innerHTML = `<b>${cleanPureDigits(lastPension.round)}회</b><span>${dateStr} 추첨</span>`;
    }

    const lastPensionGroupEl = $("#last-pension-group");
    if (lastPensionGroupEl) {
      lastPensionGroupEl.innerHTML = `<span class="group-ball team">${cleanPureDigits(lastPension.group)}</span><span class="group-label">조</span>`;
    }

    const lastPensionBallsEl = $("#last-pension-balls");
    if (lastPensionBallsEl) {
      const digits = Array.isArray(lastPension.digits)
        ? lastPension.digits
        : String(lastPension.digits).split("");
      lastPensionBallsEl.innerHTML = digits
        .map((d, i) => `<span class="group-ball b${(i % 6) + 1}">${d}</span>`)
        .join("");
    }

    // Toggle card visibility based on selected mode (lotto, pension, or all)
    const isAll = state.mode === "all";
    const showLotto = state.mode === "lotto" || isAll;
    const showPension = state.mode === "pension" || isAll;

    const lottoCard = $(".last.lotto645");
    const pensionCard = $(".last.pension720");
    const analyzerLottoBox = $("#analyzer-lotto-box");
    const analyzerPensionBox = $("#analyzer-pension-box");

    if (lottoCard) lottoCard.style.display = showLotto ? "block" : "none";
    if (pensionCard) pensionCard.style.display = showPension ? "block" : "none";
    if (analyzerLottoBox) analyzerLottoBox.style.display = showLotto ? "block" : "none";
    if (analyzerPensionBox) analyzerPensionBox.style.display = showPension ? "block" : "none";
  }

  exports.views = exports.views || {};
  exports.views.renderHome = renderHome;
})(window.PICKO);

;
window.PICKO = window.PICKO || {};

(function (exports) {
  const { $, cleanPureDigits, ballsHtml, pensionHtml, heatColor, getLottoDate, getPensionDate } = exports.utils;
  const { fetchCSVData } = exports.engine;

  let labTab = "lotto"; // 'lotto' or 'pension'
  let hasAnimated = false; // Flag to run animated loading once per session

  function getLabTab() {
    return labTab;
  }

  function setLabTab(tab) {
    labTab = tab;
  }

  function renderLoadingView(panel) {
    panel.innerHTML = `
      <div class="lab-loading-container">
        <div class="loading-card">
          <div class="loading-header">
            <h3>통계 데이터 로딩</h3>
            <p class="hint">로컬 스토리지 무결성 검증 및 회차 스캔 중...</p>
          </div>

          <!-- Top: 6/45 Progress -->
          <div class="progress-group">
            <div class="progress-label">
              <span>로또 6/45</span>
              <span id="lotto-counter" class="counter">1회</span>
            </div>
            <div class="progress-track">
              <div id="lotto-bar" class="progress-fill green" style="width: 0%;"></div>
            </div>
            <div id="lotto-status" class="status-msg">회차 데이터 검증 중...</div>
          </div>

          <!-- Bottom: Pension 720+ Progress -->
          <div class="progress-group" style="margin-top: 20px;">
            <div class="progress-label">
              <span>연금복권 720+</span>
              <span id="pension-counter" class="counter">1회</span>
            </div>
            <div class="progress-track">
              <div id="pension-bar" class="progress-fill green" style="width: 0%;"></div>
            </div>
            <div id="pension-status" class="status-msg">회차 데이터 검증 중...</div>
          </div>
        </div>
      </div>
    `;
  }

  function animateProgress(counterEl, barEl, statusEl, targetRound, check) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const duration = 600; // ms

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const currentRound = Math.floor(1 + Math.max(0, targetRound - 1) * progress);

        if (counterEl) counterEl.textContent = `${currentRound}회`;
        if (barEl) barEl.style.width = `${progress * 100}%`;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Animation finished -> check status
          if (check.isValid) {
            if (barEl) barEl.className = "progress-fill green";
            if (statusEl) {
              statusEl.className = "status-msg success";
              statusEl.textContent = `✓ 1~${targetRound}회 무결성 검증 완료`;
            }
          } else {
            if (barEl) barEl.className = "progress-fill red";
            if (statusEl) {
              statusEl.className = "status-msg error";
              statusEl.textContent = `⚠️ 누락/불완전 데이터 감지 (불완전 추천 가능성 경고)`;
            }
          }
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  async function renderLab(state, forceReload) {
    const panel = $("#lab-root");
    if (!panel) return;

    if (!hasAnimated || forceReload) {
      renderLoadingView(panel);

      const data = await fetchCSVData();

      const lottoCounter = $("#lotto-counter");
      const lottoBar = $("#lotto-bar");
      const lottoStatus = $("#lotto-status");

      const pensionCounter = $("#pension-counter");
      const pensionBar = $("#pension-bar");
      const pensionStatus = $("#pension-status");

      // Animate 6/45 top bar
      await animateProgress(
        lottoCounter,
        lottoBar,
        lottoStatus,
        data.lottoCheck.maxRound || 1,
        data.lottoCheck
      );

      // Animate Pension 720+ bottom bar
      await animateProgress(
        pensionCounter,
        pensionBar,
        pensionStatus,
        data.pensionCheck.maxRound || 1,
        data.pensionCheck
      );

      // Brief delay before switching to statistics dashboard
      await new Promise((r) => setTimeout(r, 400));
      hasAnimated = true;
    }

    renderDashboard(panel, state);
  }

  async function renderDashboard(panel, state) {
    try {
      const data = await fetchCSVData();
      const lottoData = data.lotto;
      const pensionData = data.pension;
      const lottoCheck = data.lottoCheck;
      const pensionCheck = data.pensionCheck;

      // Warnings if data has missing records
      let warningHtml = "";
      if (!lottoCheck.isValid || !pensionCheck.isValid) {
        const msgs = [];
        if (!lottoCheck.isValid) msgs.push(`로또 6/45: ${lottoCheck.errorMsg}`);
        if (!pensionCheck.isValid) msgs.push(`연금 720+: ${pensionCheck.errorMsg}`);
        warningHtml = `
          <div class="warning-banner">
            ⚠️ <b>데이터 무결성 경고</b><br/>
            ${msgs.join("<br/>")}<br/>
            <span style="font-size:11px; opacity:0.8;">(누락된 데이터로 인해 불완전한 추천이 제공될 수 있으나, 통계 및 추천 기능은 그대로 이용하실 수 있습니다.)</span>
          </div>
        `;
      }

      // Sub tab switcher inside lab
      let html = warningHtml + `
        <div class="mode" style="margin-bottom: 16px;">
          <button class="${labTab === "lotto" ? "active" : ""}" data-lab-tab="lotto" type="button">로또 6/45</button>
          <button class="${labTab === "pension" ? "active" : ""}" data-lab-tab="pension" type="button">연금복권 720+</button>
        </div>
      `;

      if (labTab === "lotto") {
        const last = lottoData[lottoData.length - 1];
        const snap = state.snapL;

        const max = Math.max(...snap.all.map((m) => m.freq));
        const min = Math.min(...snap.all.map((m) => m.freq));
        const cells = snap.all
          .map((m) => {
            const t = (m.freq - min) / (max - min || 1);
            return `<div class="cell ${m.inCluster ? "mode" : ""}" style="background:${heatColor(t)}" title="${m.n}번 · ${m.freq}회">${m.n}</div>`;
          })
          .join("");
        const bars = snap.top
          .map(
            (m) =>
              `<div class="bar-row"><span class="n">${m.n}</span><div class="bar"><i style="width:${(m.freq / max) * 100}%"></i></div><span class="c">${m.freq}</span></div>`
          )
          .join("");

        // Recent draws list (last 10 draws)
        const recentDraws = [...lottoData].reverse().slice(0, 10);
        const drawsHtml = recentDraws
          .map(
            (d) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--line);">
              <span style="font-weight:600; font-size:13px; min-width:140px;">${cleanPureDigits(d.round)}회 <span style="font-weight:400; font-size:12px; color:var(--muted); margin-left:6px;">${getLottoDate(d.round)}</span></span>
              <div class="balls">${ballsHtml(d.nums, d.bonus)}</div>
            </div>
          `
          )
          .join("");

        html += `
          <div class="lab-grid">
            <section class="panel" style="grid-column: 1 / -1;">
              <h3>최신 당첨 회차 (${cleanPureDigits(last.round)}회)</h3>
              <p class="hint">${getLottoDate(last.round)} 추첨 · 총 ${lottoData.length}회차 데이터 로드 완료</p>
              <div class="balls">${ballsHtml(last.nums, last.bonus)}</div>
            </section>

            <section class="panel">
              <h3>출현 히트맵</h3>
              <p class="hint">밝을수록 많습니다. 빨간 테두리는 최빈 집단.</p>
              <div class="heat">${cells}</div>
              <div class="legend">
                <span><i class="swatch" style="background:#1c1c1e"></i>낮음</span>
                <span><i class="swatch" style="background:#c8c8cc"></i>높음</span>
              </div>
            </section>

            <section class="panel">
              <h3>최다 출현 상위</h3>
              <p class="hint">1–${snap.n}회 · 평균 ${snap.expected.toFixed(1)}회</p>
              <div class="bars">${bars}</div>
            </section>

            <section class="panel" style="grid-column: 1 / -1;">
              <h3>최근 당첨 회차 목록</h3>
              <p class="hint">순수 숫자 회차, 추첨일 및 당첨/보너스 번호</p>
              <div>${drawsHtml}</div>
            </section>
          </div>
        `;
      } else {
        const last = pensionData[pensionData.length - 1];
        const snap = state.snapP;

        const gMax = Math.max(...snap.groups.map((g) => g.freq));
        const gBars = snap.groups
          .map(
            (g) =>
              `<div class="bar-row"><span class="n">${g.g}조</span><div class="bar"><i style="width:${(g.freq / gMax) * 100}%"></i></div><span class="c">${g.freq}</span></div>`
          )
          .join("");

        let matrix = "";
        for (let p = 0; p < 6; p++) {
          const row = snap.posF[p];
          const mx = Math.max(...row, 1);
          matrix += `<p class="hint" style="margin:10px 0 6px">${p + 1}번째 자리</p><div class="heat" style="grid-template-columns:repeat(10,1fr)">`;
          for (let d = 0; d < 10; d++) {
            matrix += `<div class="cell ${snap.cluster.includes(d) ? "mode" : ""}" style="background:${heatColor(row[d] / mx)}">${d}</div>`;
          }
          matrix += "</div>";
        }

        // Recent draws list (last 10 draws)
        const recentDraws = [...pensionData].reverse().slice(0, 10);
        const drawsHtml = recentDraws
          .map(
            (d) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--line);">
              <span style="font-weight:600; font-size:13px; min-width:140px;">${cleanPureDigits(d.round)}회 <span style="font-weight:400; font-size:12px; color:var(--muted); margin-left:6px;">${getPensionDate(d.round)}</span></span>
              <div>${pensionHtml(d.group, d.digits)}</div>
            </div>
          `
          )
          .join("");

        html += `
          <div class="lab-grid">
            <section class="panel" style="grid-column: 1 / -1;">
              <h3>최신 당첨 회차 (${cleanPureDigits(last.round)}회)</h3>
              <p class="hint">${getPensionDate(last.round)} 추첨 · 총 ${pensionData.length}회차 데이터 로드 완료</p>
              <div>${pensionHtml(last.group, last.digits)}</div>
            </section>

            <section class="panel">
              <h3>조별 출현</h3>
              <p class="hint">과열 조 ${snap.hotGroup}조</p>
              <div class="bars">${gBars}</div>
            </section>

            <section class="panel">
              <h3>자리별 출현</h3>
              <p class="hint">각 자리 0–9 독립 수치</p>
              ${matrix}
            </section>

            <section class="panel" style="grid-column: 1 / -1;">
              <h3>최근 당첨 회차 목록</h3>
              <p class="hint">순수 숫자 회차, 추첨일 및 조 / 각 자리 분리 표시</p>
              <div>${drawsHtml}</div>
            </section>
          </div>
        `;
      }

      panel.innerHTML = html;
    } catch (err) {
      console.error(err);
      panel.innerHTML = `<div class="notice" style="padding:20px; text-align:center;">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    }
  }

  exports.views = exports.views || {};
  exports.views.renderLab = renderLab;
  exports.views.getLabTab = getLabTab;
  exports.views.setLabTab = setLabTab;
})(window.PICKO);

;
window.PICKO = window.PICKO || {};

(function (exports) {
  const { $, toast, ballsHtml, pensionHtml, parseAIReport } = exports.utils;
  const { PICKTOInsight, buildReportPayload, requestStatisticsReport } = exports.engine;

  const copyIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>';

  function comboLotto(c, i) {
    return `<div class="combo">
      <div class="row">
        <span>${String(i + 1).padStart(2, "0")}</span>
        <span style="display:flex;gap:8px;align-items:center">
          <span class="fit">${c.fit}%</span>
          <button class="copy" data-copy="${c.nums.join(", ")}" title="복사">${copyIcon}</button>
        </span>
      </div>
      <div class="balls">${ballsHtml(c.nums)}</div>
    </div>`;
  }

  function comboPension(c, i) {
    return `<div class="combo">
      <div class="row">
        <span>${String(i + 1).padStart(2, "0")}</span>
        <span style="display:flex;gap:8px;align-items:center">
          <span class="fit">${c.fit}%</span>
          <button class="copy" data-copy="${c.group}조 ${c.code}" title="복사">${copyIcon}</button>
        </span>
      </div>
      <div class="balls">${pensionHtml(c.group, c.code)}</div>
    </div>`;
  }

  function consensusSummaryCard(title, sub, items, isLotto) {
    if (!items || items.length === 0) return "";

    const chipsHtml = items
      .map((item) => {
        if (isLotto) {
          const ballClass = exports.utils.getBallClass(item.n);
          return `<span class="consensus-chip">
            <span class="ball ${ballClass}" style="width:24px;height:24px;font-size:11px;flex:0 0 24px;">${item.n}</span>
            <span><b>${item.n}</b>번</span>
            <span class="freq-tag">${item.count}회 겹침</span>
          </span>`;
        } else {
          return `<span class="consensus-chip">
            <span class="group-ball b${item.pos}" style="width:24px;height:24px;font-size:11px;flex:0 0 24px;">${item.digit}</span>
            <span>${item.pos}번째 자리 <b>[${item.digit}]</b></span>
            <span class="freq-tag">${item.count}회 겹침</span>
          </span>`;
        }
      })
      .join("");

    return `
      <div class="consensus-summary-card">
        <div class="consensus-header">
          <div class="consensus-title">
            <span class="badge">수렴 앵커</span>
            <span>${title}</span>
          </div>
        </div>
        <div class="consensus-sub">${sub}</div>
        <div class="consensus-chips">${chipsHtml}</div>
      </div>
    `;
  }

  function trackCard(kind, title, sub, combos, state, isFullWidth) {
    const lotto = state.mode === "lotto";
    const body = combos.map((c, i) => (lotto ? comboLotto(c, i) : comboPension(c, i))).join("");

    return `<article class="track ${isFullWidth ? "full-width" : ""}">
      <div class="label">Track ${kind.toUpperCase()}</div>
      <h3>${title}</h3>
      <p class="sub">${sub}</p>
      ${body}
    </article>`;
  }

  function aiReportCard(aiReport, isAiLoading, isAiError, fallbackInsight) {
    let contentHtml = "";

    if (isAiLoading) {
      contentHtml = `
        <div class="ai-inline-loading">
          <div class="spinner"></div>
          <span><span class="logo-inline">PICK<span>+</span>O</span> AI가 다차원 통계 및 베이즈 확률을 분석 중입니다...</span>
        </div>
      `;
    } else {
      const rawContent = aiReport || fallbackInsight;
      const parsedContent = parseAIReport(rawContent);
      const tagText = isAiError
        ? `<span class="ai-tag" style="color:#ff3b30; margin-bottom:8px;">⚠️ AI 서버 응답 실패 (기본 분석 표시)</span>`
        : `<span class="ai-tag" style="margin-bottom:8px;"><span class="logo-inline">PICK<span>+</span>O</span> 브라우저 통계 요약</span>`;
      contentHtml = `${tagText}<div>${parsedContent}</div>`;
    }

    return `
      <details class="ai-report-card" open>
        <summary><span class="logo-inline">PICK<span>+</span>O</span> 통계 해석</summary>
        <div class="bubble">${contentHtml}</div>
      </details>
    `;
  }

  function renderResult(state) {
    const r = state.result;
    if (!r) return;

    if (r.mode === "all") {
      $("#result-kicker").textContent = "로또 6/45 10개 + 연금 720+ 10개 (총 20개 조합)";
      $("#result-title").textContent = "30회 수렴 앙상블 완전 추천 (5개씩 총 10개 + 5개씩 총 10개)";
    } else if (r.mode === "lotto") {
      $("#result-kicker").textContent = "로또 6/45 10개 조합";
      $("#result-title").textContent = "30회 수렴 앙상블 추천 (기본 5개 + 통계제외 5개 = 총 10개)";
    } else {
      $("#result-kicker").textContent = "연금복권 720+ 10개 조합";
      $("#result-title").textContent = "30회 수렴 앙상블 추천 (기본 5개 + 통계제외 5개 = 총 10개)";
    }

    const grid = $("#result-grid");
    if (!grid) return;
    grid.innerHTML = "";

    // 1. 로또 섹션 렌더링
    if (r.lottoA || r.lottoB) {
      grid.insertAdjacentHTML(
        "beforeend",
        `<div style="grid-column: 1 / -1; font-weight:700; font-size:16px; margin: 8px 0 4px; color:var(--fg); display:flex; align-items:center; gap:8px;">
          <span>로또 6/45</span>
          <span style="font-size:12px; font-weight:600; padding:2px 8px; border-radius:10px; background:#2a2a2e; color:#30d158;">${(r.lottoA?.length || 0) + (r.lottoB?.length || 0)}개 조합</span>
        </div>`
      );

      // 최다 겹침 핵심 번호 카드
      const lottoConsensus = (r.lottoA && r.lottoA.consensus) || (r.lottoB && r.lottoB.consensus) || [];
      if (lottoConsensus.length > 0) {
        grid.insertAdjacentHTML(
          "beforeend",
          consensusSummaryCard(
            "30회 수렴 연산에서 가장 강력하게 겹친 핵심 앵커 번호",
            "150개 정예 후보 중 가장 높은 빈도로 중복 출현한 번호들이며, 아래 조합 곳곳에 상호 겹쳐 배치되었습니다.",
            lottoConsensus,
            true
          )
        );
      }

      if (r.lottoA) {
        grid.insertAdjacentHTML(
          "beforeend",
          trackCard("a", "기본 추첨", "정석 통계 & 최다 겹침 앵커 5개", r.lottoA, { mode: "lotto" }, false)
        );
      }
      if (r.lottoB) {
        grid.insertAdjacentHTML(
          "beforeend",
          trackCard("b", "통계 제외 추첨", "과밀 억제 & 역발상 앵커 5개", r.lottoB, { mode: "lotto" }, false)
        );
      }
    }

    // 2. 연금복권 섹션 렌더링
    if (r.pensionA || r.pensionB) {
      grid.insertAdjacentHTML(
        "beforeend",
        `<div style="grid-column: 1 / -1; font-weight:700; font-size:16px; margin: 20px 0 4px; color:var(--fg); display:flex; align-items:center; gap:8px;">
          <span>연금복권 720+</span>
          <span style="font-size:12px; font-weight:600; padding:2px 8px; border-radius:10px; background:#2a2a2e; color:#0a84ff;">${(r.pensionA?.length || 0) + (r.pensionB?.length || 0)}개 조합</span>
        </div>`
      );

      // 연금복권 최다 겹침 자리별 앵커 카드
      const pensionConsensus = (r.pensionA && r.pensionA.consensus) || (r.pensionB && r.pensionB.consensus) || [];
      if (pensionConsensus.length > 0) {
        grid.insertAdjacentHTML(
          "beforeend",
          consensusSummaryCard(
            "30회 수렴 연산에서 각 자리별 가장 강력하게 겹친 숫자",
            "150개 후보 중 자릿수별로 지배적인 최빈 숫자들이며, 아래 조합에 공통 패턴으로 겹쳐 조립되었습니다.",
            pensionConsensus,
            false
          )
        );
      }

      if (r.pensionA) {
        grid.insertAdjacentHTML(
          "beforeend",
          trackCard("a", "기본 추첨", "순열 균형 & 자리별 최빈 겹침 5개", r.pensionA, { mode: "pension" }, false)
        );
      }
      if (r.pensionB) {
        grid.insertAdjacentHTML(
          "beforeend",
          trackCard("b", "통계 제외 추첨", "패턴 회피 & 안정 순열 5개", r.pensionB, { mode: "pension" }, false)
        );
      }
    }

    const fallbackInsight = r.insightA || r.insightB || "분석 결과를 불러오는 중입니다.";
    grid.insertAdjacentHTML(
      "beforeend",
      aiReportCard(r.aiReport, r.isAiLoading, r.isAiError, fallbackInsight)
    );
  }

  // ==========================================================================
  // Anime.js Interactive Simulation Visual Controller
  // ==========================================================================
  const simAnimeController = {
    activeAnimations: [],
    flickerTimer: null,
    counterState: { count: 0 },
    convState: { val: 0 },

    start() {
      this.stop();
      this.counterState.count = 0;
      this.convState.val = 0;

      if (typeof window.anime === "undefined") {
        // CSS handles motion in the dependency-free static version.
        return;
      }

      // 1. Core Node Pulse Animation
      const coreAnim = window.anime({
        targets: ".sim-core-node",
        scale: [0.92, 1.15],
        boxShadow: [
          "0 0 12px #0a84ff, 0 0 20px rgba(10, 132, 255, 0.4)",
          "0 0 28px #0a84ff, 0 0 50px rgba(10, 132, 255, 0.9)",
        ],
        direction: "alternate",
        loop: true,
        easing: "easeInOutSine",
        duration: 750,
      });
      this.activeAnimations.push(coreAnim);

      // 2. Orbit Balls Revolution
      const balls = document.querySelectorAll(".orbit-ball");
      balls.forEach((ball, idx) => {
        const angleOffset = (idx / 6) * Math.PI * 2;
        const radius = 46;
        const stateObj = { angle: angleOffset };

        const anim = window.anime({
          targets: stateObj,
          angle: angleOffset + Math.PI * 2,
          duration: 3200 + idx * 250,
          loop: true,
          easing: "linear",
          update: () => {
            const x = Math.cos(stateObj.angle) * radius;
            const y = Math.sin(stateObj.angle) * radius;
            ball.style.transform = `translate(${x}px, ${y}px)`;
          },
        });
        this.activeAnimations.push(anim);
      });

      // 3. Footer Balls Stagger Wave
      const footerAnim = window.anime({
        targets: "#sim-footer-balls .sim-ball",
        translateY: [0, -12],
        scale: [0.85, 1.2],
        delay: window.anime.stagger(100),
        direction: "alternate",
        loop: true,
        easing: "easeInOutQuad",
        duration: 480,
      });
      this.activeAnimations.push(footerAnim);

      // 4. Random number flickering inside orbiting balls
      this.flickerTimer = setInterval(() => {
        balls.forEach((ball) => {
          ball.textContent = Math.floor(Math.random() * 45) + 1;
        });
      }, 90);
    },

    update(processed, total, progress, opsPerSec, bestFit, convergence, topCount, stageText) {
      const countEl = $("#sim-count-display");
      const barEl = $("#sim-progress-fill");
      const pinEl = $("#sim-glow-pin");
      const speedEl = $("#sim-speed");
      const fitEl = $("#sim-best-fit");
      const convEl = $("#sim-convergence");
      const topCountEl = $("#sim-top-count");
      const stageEl = $("#sim-stage-text");

      if (speedEl && opsPerSec) speedEl.textContent = `${opsPerSec.toLocaleString()} ops/s`;
      if (fitEl && bestFit) fitEl.textContent = `${bestFit}%`;
      if (topCountEl && topCount) topCountEl.textContent = topCount;
      if (stageEl && stageText) stageEl.textContent = stageText;

      if (typeof window.anime !== "undefined") {
        // Smooth Progress Bar & Glow Pin
        window.anime({
          targets: barEl,
          width: `${progress}%`,
          duration: 180,
          easing: "easeOutCubic",
        });
        window.anime({
          targets: pinEl,
          left: `${progress}%`,
          duration: 180,
          easing: "easeOutCubic",
        });

        // Smooth Counter Rolling
        window.anime({
          targets: this.counterState,
          count: processed,
          duration: 180,
          easing: "easeOutQuad",
          round: 1,
          update: () => {
            if (countEl) countEl.textContent = Math.round(this.counterState.count).toLocaleString();
          },
        });

        // Smooth Convergence Meter
        window.anime({
          targets: this.convState,
          val: convergence,
          duration: 180,
          easing: "easeOutQuad",
          round: 1,
          update: () => {
            if (convEl) convEl.textContent = `${Math.round(this.convState.val)}%`;
          },
        });
      } else {
        if (countEl) countEl.textContent = processed.toLocaleString();
        if (barEl) barEl.style.width = `${progress}%`;
        if (pinEl) pinEl.style.left = `${progress}%`;
        if (convEl) convEl.textContent = `${convergence}%`;
      }
    },

    finish(anchors) {
      if (this.flickerTimer) {
        clearInterval(this.flickerTimer);
        this.flickerTimer = null;
      }

      // If anchors provided, lock balls to the top consensus numbers
      if (anchors && anchors.length > 0) {
        const balls = document.querySelectorAll(".orbit-ball");
        balls.forEach((ball, i) => {
          if (anchors[i]) {
            ball.textContent = anchors[i].n || anchors[i].digit || (i + 1);
          }
        });
      }

      if (typeof window.anime !== "undefined") {
        window.anime({
          targets: ".sim-core-node",
          scale: [1, 1.4, 1],
          duration: 600,
          easing: "easeOutElastic(1, .5)",
        });
      }
    },

    stop() {
      if (this.flickerTimer) {
        clearInterval(this.flickerTimer);
        this.flickerTimer = null;
      }
      this.activeAnimations.forEach((anim) => {
        try {
          anim.pause();
        } catch (e) {}
      });
      this.activeAnimations = [];
    },
  };

  async function runGenerate(which,state,setViewCallback) {
    if(state.generating)return;
    if(!state.lotto||!state.pension){toast('데이터를 불러오는 중이야. 잠시만 기다려 줘!');return;}
    state.generating=true;
    const n=state.games||1000,mode=state.mode,tracks=which==='A'?['A']:which==='B'?['B']:['A','B'];
    const modes=mode==='all'?['lotto','pension']:[mode],total=modes.length*tracks.length*30*n,modalEl=$('#simulation-modal');
    const generated={lotto:{},pension:{}};let trackIndex=0;
    try {
      if(modalEl)modalEl.classList.add('on'); const totalDisplay=$('#sim-total-display'); if(totalDisplay)totalDisplay.textContent='/ '+total.toLocaleString()+' 회 연산'; simAnimeController.start();
      for(const kind of modes)for(const track of tracks){
        const index=trackIndex++;
        generated[kind][track]=await state[kind].runEnsembleSimulations(track,n,p=>{
          const processed=Math.min(total,index*30*n+p.totalProcessed);
          simAnimeController.update(processed,total,Math.round(processed/total*100),p.opsPerSec,p.bestFit,p.convergence||0,p.poolSize+'/150개',kind+' '+track+' · '+p.round+'/30차 조합 탐색');
        });
      }
      const lottoRes=modes.includes('lotto')?generated.lotto:null,pensionRes=modes.includes('pension')?generated.pension:null;
      const insightA=lottoRes?.A?PICKTOInsight.lotto('A',lottoRes.A,state.snapL):pensionRes?.A?PICKTOInsight.pension('A',pensionRes.A,state.snapP):'';
      const insightB=lottoRes?.B?PICKTOInsight.lotto('B',lottoRes.B,state.snapL):pensionRes?.B?PICKTOInsight.pension('B',pensionRes.B,state.snapP):'';
      const local=await requestStatisticsReport(buildReportPayload(mode,which,lottoRes,pensionRes,state.snapL,state.snapP));
      state.result={mode,which,A:mode==='lotto'?lottoRes?.A:mode==='pension'?pensionRes?.A:null,B:mode==='lotto'?lottoRes?.B:mode==='pension'?pensionRes?.B:null,lottoA:lottoRes?.A,lottoB:lottoRes?.B,pensionA:pensionRes?.A,pensionB:pensionRes?.B,insightA,insightB,aiReport:local.report,isAiLoading:false,isAiError:false};
      if(setViewCallback)setViewCallback('result');renderResult(state);
      const countL=(lottoRes?.A?.length||0)+(lottoRes?.B?.length||0),countP=(pensionRes?.A?.length||0)+(pensionRes?.B?.length||0);
      $('#result-kicker').textContent=[countL?'로또 '+countL+'개':'',countP?'연금 '+countP+'개':''].filter(Boolean).join(' · ');
      $('#result-title').textContent=which==='A'?'기본 조합 추출 결과':which==='B'?'통계 제외 조합 추출 결과':'두 방식의 조합 추출 결과';
    } catch(error){console.error(error);toast('계산을 마치지 못했어. 횟수를 줄여 다시 시도해 줘.');}
    finally{simAnimeController.stop();if(modalEl)modalEl.classList.remove('on');state.generating=false;}
  }

  exports.views = exports.views || {};
  exports.views.renderResult = renderResult;
  exports.views.runGenerate = runGenerate;
})(window.PICKO);

;
window.PICKO = window.PICKO || {};

(function (exports) {
  const { $, $$, toast, copyText } = exports.utils;
  const { fetchCSVData, PICKTOEngine } = exports.engine;
  const { renderHome, renderLab, setLabTab, runGenerate } = exports.views;

  const state = {
    mode: "all",
    view: "home",
    games: 1000,
    lotto: null,
    pension: null,
    snapL: null,
    snapP: null,
    result: null,
  };

  function setView(name) {
    state.view = name;
    $$(".view").forEach((v) => v.classList.toggle("on", v.dataset.view === name));
    $$(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  }

  function setMode(mode) {
    state.mode = mode;
    $$(".mode button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
    renderHome(state);
    if (state.view === "lab") renderLab(state);
    if (state.view === "result" && state.result && state.result.mode !== mode) {
      state.result = null;
      setView("home");
    }
  }

  document.addEventListener("click", (e) => {
    const labTabBtn = e.target.closest("button[data-lab-tab]");
    if (labTabBtn) {
      setLabTab(labTabBtn.dataset.labTab);
      renderLab(state);
      return;
    }
    const modeBtn = e.target.closest("button[data-mode]");
    if (modeBtn) {
      setMode(modeBtn.dataset.mode);
      return;
    }
    const viewBtn = e.target.closest(".tabs button[data-view]");
    if (viewBtn) {
      const name = viewBtn.dataset.view;
      if (name === "lab") {
        renderLab(state);
      }
      setView(name);
      return;
    }
    const stepBtn = e.target.closest("button[data-n]");
    if (stepBtn) {
      state.games = Number(stepBtn.dataset.n);
      $$("button[data-n]").forEach((x) => x.classList.toggle("on", x === stepBtn));
      return;
    }
    if (e.target.closest("#btn-a")) {
      runGenerate("A", state, setView);
      return;
    }
    if (e.target.closest("#btn-b")) {
      runGenerate("B", state, setView);
      return;
    }
    if (e.target.closest("#btn-both")) {
      runGenerate("both", state, setView);
      return;
    }
    if (e.target.closest("#btn-again")) {
      if (state.result) runGenerate(state.result.which, state, setView);
      return;
    }
    if (e.target.closest("#btn-refresh-data")) {
      loadData(true);
      return;
    }
    const copyBtn = e.target.closest(".copy");
    if (copyBtn) {
      copyText(copyBtn.getAttribute("data-copy") || "");
    }
  });

  let lastRefreshTime = 0;
  const REFRESH_COOLDOWN_MS = 3000; // 3초 쿨다운

  async function loadData(force = false) {
    const refreshBtn = $("#btn-refresh-data");
    const refreshText = refreshBtn ? refreshBtn.querySelector(".refresh-text") : null;

    if (force) {
      const now = Date.now();
      if (now - lastRefreshTime < REFRESH_COOLDOWN_MS) {
        const remaining = Math.ceil((REFRESH_COOLDOWN_MS - (now - lastRefreshTime)) / 1000);
        toast(`잠시 후에 다시 시도해줘! (${remaining}초 남음)`);
        return;
      }
      if (refreshBtn && refreshBtn.classList.contains("loading")) {
        return;
      }
      lastRefreshTime = now;
      if (refreshBtn) refreshBtn.classList.add("loading");
      if (refreshText) refreshText.textContent = "동기화 중...";
    }

    try {
      const data = await fetchCSVData(force);
      state.lotto = new PICKTOEngine.LottoEngine(data.lotto);
      state.pension = new PICKTOEngine.PensionEngine(data.pension);
      state.snapL = state.lotto.snapshot();
      state.snapP = state.pension.snapshot();
      renderHome(state);
      const dataNote = $("#data-note"); if(dataNote) dataNote.textContent = `현재 데이터: 로또 ${state.snapL.last.round}회 · 연금 ${state.snapP.last.round}회. 새로고침은 공개 원본 데이터와 다시 동기화해.`;
      if (state.view === "lab") {
        renderLab(state);
      }
      if (force) {
        const lottoRound = state.snapL?.last?.round ? `${state.snapL.last.round}회` : "";
        const pensionRound = state.snapP?.last?.round ? `${state.snapP.last.round}회` : "";
        const roundInfo = [lottoRound && `로또 ${lottoRound}`, pensionRound && `연금 ${pensionRound}`]
          .filter(Boolean)
          .join(" / ");
        toast(`데이터 갱신 완료! ${roundInfo ? `(${roundInfo})` : ""}`);
      }
    } catch (err) {
      console.error(err);
      toast(force ? "데이터 갱신에 실패했습니다" : "데이터를 불러오지 못했습니다");
    } finally {
      if (refreshBtn) {
        refreshBtn.classList.remove("loading");
        if (refreshText) refreshText.textContent = "데이터 새로고침";
      }
    }
  }

  // 수동 분석 이력 관리 (세션 단위 중복 감지)
  const analyzedHistory = [];

  function formatTime(d) {
    return [
      String(d.getHours()).padStart(2, "0"),
      String(d.getMinutes()).padStart(2, "0"),
      String(d.getSeconds()).padStart(2, "0"),
    ].join(":");
  }

  function handleAnalyzeLotto() {
    if (!state.lotto || !state.snapL) {
      toast("로또 통계 데이터를 불러오는 중이야. 잠시만 기다려줘!");
      return;
    }
    const inputEl = $("#input-lotto-nums");
    if (!inputEl) return;
    const rawVal = inputEl.value.trim();
    if (!rawVal) {
      toast("분석할 로또 번호 6개를 입력해줘! (예: 7, 12, 19, 23, 34, 42)");
      inputEl.focus();
      return;
    }

    // 파싱 (쉼표, 띄어쓰기, 하이픈 등)
    const tokens = rawVal.split(/[\s,–-]+/).map((s) => s.trim()).filter(Boolean);
    if (tokens.length !== 6) {
      toast("정확히 6개의 숫자를 입력해줘! (현재 " + tokens.length + "개)");
      return;
    }

    const nums = tokens.map(Number);
    if (nums.some((n) => isNaN(n) || !Number.isInteger(n) || n < 1 || n > 45)) {
      toast("1부터 45 사이의 자연수를 입력해줘!");
      return;
    }

    const uniqueSet = new Set(nums);
    if (uniqueSet.size !== 6) {
      toast("중복된 번호가 있어! 6개 모두 서로 다른 번호를 입력해줘.");
      return;
    }

    const sorted = [...nums].sort((a, b) => a - b);
    const key = sorted.join(",");

    // 중복 검사
    const now = new Date();
    const timeStr = formatTime(now);
    const prev = analyzedHistory.find((h) => h.type === "lotto" && h.key === key);
    let isDuplicate = false;
    let dupCount = 1;
    let prevTime = "";

    if (prev) {
      isDuplicate = true;
      prev.count = (prev.count || 1) + 1;
      prevTime = prev.lastTime || prev.timeStr;
      prev.lastTime = timeStr;
      dupCount = prev.count;
      toast("⚠️ 이전에 이미 분석했던 로또 조합이야!");
    } else {
      analyzedHistory.push({
        type: "lotto",
        key,
        timeStr,
        count: 1,
      });
    }

    // 엔진 분석 수행
    const analysis = exports.engine.analyzeUserLotto(sorted, state.lotto, state.snapL);
    if (!analysis) {
      toast("분석 중 오류가 발생했어.");
      return;
    }

    renderLottoAnalysis(analysis, isDuplicate, prevTime, dupCount);
  }

  function renderLottoAnalysis(analysis, isDuplicate, prevTime, dupCount) {
    const resEl = $("#analyzer-result");
    if (!resEl) return;

    const { ballsHtml } = exports.utils;
    const isHistDanger = analysis.isHistoricalWin;

    let dupHtml = "";
    if (isDuplicate) {
      dupHtml = `
        <div class="dup-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span><strong>이미 분석해본 번호야!</strong> (이전 분석: ${prevTime})</span>
          <span class="dup-count">총 ${dupCount}회 조회됨</span>
        </div>
      `;
    }

    const html = `
      ${dupHtml}
      <div class="res-header-row">
        <div class="res-lot-title">
          <span>로또 6/45 분석 결과</span>
          <span class="badge-type">6개 조합</span>
        </div>
      </div>
      <div class="res-balls-wrap">
        <div class="balls">
          ${ballsHtml(analysis.nums)}
        </div>
      </div>

      <div class="res-track-grid">
        <div class="track-card track-a">
          <div class="track-top-row">
            <div class="track-name">
              <span class="dot"></span>
              <span>Track A (정석 통계 & 균형)</span>
            </div>
            <div class="track-score-wrap">
              <span class="track-score-val">${analysis.scoreA.toFixed(1)}</span>
              <span class="track-score-max">/ 100점</span>
            </div>
          </div>
          <div class="track-desc">
            가우시안 합계 적합도, 홀짝/고저 이항분포, 결합 빈도(Lift)를 종합 평가한 통계적 자연스러움 점수야.
          </div>
        </div>

        <div class="track-card track-b">
          <div class="track-top-row">
            <div class="track-name">
              <span class="dot"></span>
              <span>Track B (생일 역설 & 과밀 억제)</span>
            </div>
            <div class="track-score-wrap">
              <span class="track-score-val">${analysis.scoreB.toFixed(1)}</span>
              <span class="track-score-max">/ 100점</span>
            </div>
          </div>
          <div class="track-desc">
            역대 1등 기출 배제, 최근 100회 최다 겹침 수 억제, 핫번호 과밀 회피를 평가한 역발상 점수야.
          </div>
        </div>
      </div>

      <div class="res-stats-grid">
        <div class="stat-cell">
          <span class="stat-label">번호 총합</span>
          <span class="stat-value">${analysis.sum} (오차 ${analysis.sumDiff >= 0 ? "+" : ""}${analysis.sumDiff})</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">홀:짝 비율</span>
          <span class="stat-value">${analysis.oddCount} : ${analysis.evenCount}</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">저(1~22):고(23~45)</span>
          <span class="stat-value">${analysis.lowCount} : ${analysis.highCount}</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">결합 강도 (Mean Lift)</span>
          <span class="stat-value ${analysis.meanLift >= 1.0 ? "highlight-good" : ""}">${analysis.meanLift.toFixed(2)}배</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">핫번호 / 지연수</span>
          <span class="stat-value">핫 ${analysis.hotCount}개 / 지연 ${analysis.overdueCount}개</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">역대 1등 기출 여부</span>
          <span class="stat-value ${isHistDanger ? "highlight-danger" : "highlight-good"}">${isHistDanger ? "기출 1등 일치 (위험)" : "미출현 신규 조합"}</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">최근 100회 최대 겹침</span>
          <span class="stat-value ${analysis.maxOverlap >= 5 ? "highlight-warn" : ""}">${analysis.maxOverlap}개 일치</span>
        </div>
      </div>
    `;

    resEl.innerHTML = html;
    resEl.style.display = "block";
    resEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function handleAnalyzePension() {
    if (!state.pension || !state.snapP) {
      toast("연금복권 통계 데이터를 불러오는 중이야. 잠시만 기다려줘!");
      return;
    }
    const inputEl = $("#input-pension-nums");
    if (!inputEl) return;
    const rawVal = inputEl.value.trim();
    if (!rawVal) {
      toast("분석할 연금복권 6자리 숫자를 입력해줘! (예: 708192)");
      inputEl.focus();
      return;
    }

    const cleaned = rawVal.replace(/\D/g, "");
    if (cleaned.length !== 6) {
      toast("조를 제외한 6자리 숫자를 정확하게 입력해줘! (현재 " + cleaned.length + "자리)");
      return;
    }

    const digits = cleaned.split("").map(Number);
    const key = cleaned;

    // 중복 검사
    const now = new Date();
    const timeStr = formatTime(now);
    const prev = analyzedHistory.find((h) => h.type === "pension" && h.key === key);
    let isDuplicate = false;
    let dupCount = 1;
    let prevTime = "";

    if (prev) {
      isDuplicate = true;
      prev.count = (prev.count || 1) + 1;
      prevTime = prev.lastTime || prev.timeStr;
      prev.lastTime = timeStr;
      dupCount = prev.count;
      toast("⚠️ 이전에 이미 분석했던 연금복권 조합이야!");
    } else {
      analyzedHistory.push({
        type: "pension",
        key,
        timeStr,
        count: 1,
      });
    }

    // 엔진 분석 수행 (조 생략)
    const analysis = exports.engine.analyzeUserPension(digits, state.pension, state.snapP);
    if (!analysis) {
      toast("분석 중 오류가 발생했어.");
      return;
    }

    renderPensionAnalysis(analysis, isDuplicate, prevTime, dupCount);
  }

  function renderPensionAnalysis(analysis, isDuplicate, prevTime, dupCount) {
    const resEl = $("#analyzer-result");
    if (!resEl) return;

    let dupHtml = "";
    if (isDuplicate) {
      dupHtml = `
        <div class="dup-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span><strong>이미 분석해본 번호야!</strong> (이전 분석: ${prevTime})</span>
          <span class="dup-count">총 ${dupCount}회 조회됨</span>
        </div>
      `;
    }

    const ballsHtml = analysis.digits
      .map((d, i) => `<span class="group-ball b${(i % 6) + 1}">${d}</span>`)
      .join("");

    const specialPatterns = [];
    if (analysis.isLinear) specialPatterns.push("등차수열");
    if (analysis.isPalindrome) specialPatterns.push("대칭(회문)");
    if (analysis.isTripletRepeat) specialPatterns.push("3자리 반복");
    const patternText = specialPatterns.length > 0 ? specialPatterns.join(", ") : "특이 인위적 패턴 없음";

    const html = `
      ${dupHtml}
      <div class="res-header-row">
        <div class="res-lot-title">
          <span>연금복권 720+ 6자리 순열 분석 결과</span>
          <span class="badge-type">조 생략 (한정 수량)</span>
        </div>
      </div>
      <div class="res-balls-wrap">
        <div class="pension-row">
          ${ballsHtml}
        </div>
      </div>

      <div class="res-track-grid">
        <div class="track-card track-a">
          <div class="track-top-row">
            <div class="track-name">
              <span class="dot"></span>
              <span>Track A (정석 순열 균형)</span>
            </div>
            <div class="track-score-wrap">
              <span class="track-score-val">${analysis.scoreA.toFixed(1)}</span>
              <span class="track-score-max">/ 100점</span>
            </div>
          </div>
          <div class="track-desc">
            자릿수 합계(평균 27), 홀짝 이항분포, 정보 엔트로피를 종합 평가한 순열 균형 점수야.
          </div>
        </div>

        <div class="track-card track-b">
          <div class="track-top-row">
            <div class="track-name">
              <span class="dot"></span>
              <span>Track B (패턴 회피 & 과밀 억제)</span>
            </div>
            <div class="track-score-wrap">
              <span class="track-score-val">${analysis.scoreB.toFixed(1)}</span>
              <span class="track-score-max">/ 100점</span>
            </div>
          </div>
          <div class="track-desc">
            등차수열/연속번호, 팰린드롬, 최근 50회 끝 4자리 중복 충돌을 강력하게 억제한 점수야.
          </div>
        </div>
      </div>

      <div class="res-stats-grid">
        <div class="stat-cell">
          <span class="stat-label">자릿수 총합</span>
          <span class="stat-value">${analysis.sum} (오차 ${analysis.sumDiff >= 0 ? "+" : ""}${analysis.sumDiff})</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">정보 엔트로피 (H)</span>
          <span class="stat-value ${analysis.entropy >= 2.5 ? "highlight-good" : ""}">${analysis.entropy} bit</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">고유 숫자 수</span>
          <span class="stat-value">${analysis.uniqueCount}개 / 6개</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">홀:짝 분포</span>
          <span class="stat-value">${analysis.oddCount} : ${analysis.evenCount}</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">자릿수 분산도 (Var)</span>
          <span class="stat-value">${analysis.varDelta}</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">역대 1등 기출 여부</span>
          <span class="stat-value ${analysis.isHistoricalWin ? "highlight-danger" : "highlight-good"}">${analysis.isHistoricalWin ? "역대 1등 일치" : "신규 조합"}</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">최근 50회 끝 4자리 충돌</span>
          <span class="stat-value ${analysis.isLast4Collision ? "highlight-warn" : "highlight-good"}">${analysis.isLast4Collision ? "끝 4자리 충돌" : "충돌 없음"}</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">특수 패턴 감지</span>
          <span class="stat-value ${specialPatterns.length > 0 ? "highlight-warn" : ""}">${patternText}</span>
        </div>
      </div>
    `;

    resEl.innerHTML = html;
    resEl.style.display = "block";
    resEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // 수동 분석기 이벤트 바인딩
  document.addEventListener("click", (e) => {
    if (e.target.closest("#btn-analyze-lotto")) {
      handleAnalyzeLotto();
      return;
    }
    if (e.target.closest("#btn-analyze-pension")) {
      handleAnalyzePension();
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (document.activeElement && document.activeElement.id === "input-lotto-nums") {
        e.preventDefault();
        handleAnalyzeLotto();
      } else if (document.activeElement && document.activeElement.id === "input-pension-nums") {
        e.preventDefault();
        handleAnalyzePension();
      }
    }
  });

  async function boot() {
    await loadData(false);
    setView("home");
  }

  boot();
})(window.PICKO);
