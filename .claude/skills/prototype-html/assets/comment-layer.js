// ════════════════════════════════════════════════════════════════════════
// COMMENT LAYER — ghim comment kiểu Figma lên prototype HTML tự chứa
// Tự chứa, không phụ thuộc thư viện. Chèn ngay trước thẻ đóng body.
// Yêu cầu vật chủ: có .proto-app, các <section data-screen="{slug}">,
// và (tuỳ chọn) hàm showScreen(slug) để nhảy màn khi click comment trong danh sách.
// ════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ════════════════════════════════════════════════════════════════════════
  // TẮT HẲN LỚP GÓP Ý (mode "no comment")
  // Đặt window.CMT_DISABLED = true TRƯỚC khi nhúng file này → không tạo bất kỳ
  // nút/menu/lớp phủ nào, prototype chạy y như bản không có comment.
  // Dùng khi bản prototype chỉ để trình chiếu, không cần thu thập góp ý.
  // ════════════════════════════════════════════════════════════════════════
  if (window.CMT_DISABLED === true) return;

  // ════════════════════════════════════════════════════════════════════════
  // CẤU HÌNH LƯU TRỮ CHUNG (tuỳ chọn) — điền vào để comment chia sẻ được cho mọi người.
  //
  // ĐỂ TRỐNG → hoạt động như cũ: chỉ lưu trên máy này (localStorage), không chia sẻ.
  // ĐIỀN VÀO → comment lưu lên jsonbin.io, ai mở link cũng thấy comment của nhau.
  //
  // Cách lấy (một lần, ~5 phút, không cần biết code — xem HUONG-DAN-LUU-CHUNG.md):
  //   1. Đăng ký jsonbin.io (email) → API Keys → copy "Master Key".
  //   2. Bấm "Create Bin" → nội dung {"list":[]} → Save → copy "Bin ID" trên URL.
  //   3. Dán 2 giá trị vào đây (hoặc đặt window.CMT_BIN_ID / window.CMT_BIN_KEY trước khi nhúng).
  //
  // LƯU Ý BẢO MẬT: Master Key lộ trong file HTML → ai xem "View Source" cũng lấy được và
  // sửa/xoá được dữ liệu. CHỈ dùng cho prototype NỘI BỘ (chấp nhận rủi ro "không ai phá").
  // Đừng dùng cách này cho dữ liệu quan trọng/công khai.
  //
  // Có thể nhập trực tiếp trong ứng dụng (nút bánh răng "Cài đặt lưu chung" trên thanh công cụ)
  // thay vì sửa file — tiện cho người không mở được code. Giá trị nhập trong app được
  // ưu tiên; nếu trống thì dùng biến window bên dưới.
  // ════════════════════════════════════════════════════════════════════════
  // ── PHẠM VI THEO TỪNG FILE (rất quan trọng) ──────────────────────────────
  // Nhiều file prototype mở trên CÙNG một trình duyệt (file:// hoặc cùng domain) dùng
  // CHUNG một localStorage. Nếu đặt key kiểu "cmt:cfg" (toàn cục) thì file B sẽ ghi đè
  // cấu hình của file A → mở lại file A lại chạy nhầm bin của file B, comment trộn vào nhau.
  // Vì vậy MỌI key đều gắn "chữ ký của file" (đường dẫn file), để các file HOÀN TOÀN riêng lẻ.
  var FILE_SCOPE = (function () {
    try {
      var p = decodeURIComponent(location.pathname || '');
      var name = p.split('/').pop() || 'index';
      // gộp cả thư mục cha để 2 file trùng tên ở 2 nơi vẫn phân biệt được
      var dir = p.slice(0, p.length - name.length);
      var sig = (dir + name).replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
      return sig || 'app';
    } catch (e) { return 'app'; }
  })();
  var CFG_KEY = 'cmt:' + FILE_SCOPE + ':cfg';   // cấu hình RIÊNG cho file này
  function loadCfg() {
    try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveCfg(obj) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(obj || {})); } catch (e) {}
  }

  // Dọn comment + tombstone CỦA RIÊNG FILE NÀY (không đụng file prototype khác).
  // Dùng khi ĐỔI kho (bin) — comment kho cũ không được lẫn sang kho mới.
  function clearLocalComments() {
    var prefix = 'cmt:' + FILE_SCOPE + ':';
    var keep = {};
    keep[prefix + 'cfg'] = 1; keep[prefix + 'admin'] = 1; keep[prefix + 'feature-lock'] = 1;
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf(prefix) === 0 && !keep[k]) localStorage.removeItem(k);   // chỉ file này
      });
    } catch (e) {}
  }

  // ── LINK CHIA SẺ: URL dạng ...#cmt=<binId>~<key> → tự nhận cấu hình, lưu, rồi xoá khỏi URL ──
  // Nhờ vậy mở ở máy/browser mới chỉ cần DÁN 1 link là tự nối, không phải gõ Bin ID + Key.
  // Chạy SỚM (trước khi app điều hướng theo hash) để không lẫn với hash tên màn.
  // Kiểm tính hợp lệ của Bin ID / Master Key (bắt lỗi copy thiếu, đứt đoạn).
  // Dùng chung cho cả link chia sẻ lẫn ô nhập trong Cài đặt.
  function validateBinId(v) {
    v = (v || '').trim();
    if (!v) return 'Thiếu Bin ID.';
    if (/\s/.test(v)) return 'Bin ID chứa khoảng trắng — link có thể bị đứt khi copy.';
    if (v.indexOf('/') > -1 || v.indexOf('http') === 0) return 'Bin ID không hợp lệ (đang là cả đường link).';
    if (v.length < 8) return 'Bin ID quá ngắn — link có thể bị copy thiếu.';
    return '';
  }
  function validateBinKey(v) {
    v = (v || '').trim();
    if (!v) return 'Thiếu Master Key — link bị copy thiếu phần khoá.';
    if (/\s/.test(v)) return 'Master Key chứa khoảng trắng — link bị đứt khi copy.';
    if (v.indexOf('$2') !== 0) return 'Master Key sai định dạng (phải bắt đầu bằng "$2...").';
    if (v.length < 40) return 'Master Key quá ngắn — link bị copy thiếu (khoá jsonbin thường dài ~60 ký tự).';
    return '';
  }

  // Kết quả import link (để phần sau hiển thị lỗi chặn review nếu link hỏng)
  var shareLinkError = '';

  // ── LINK CHIA SẺ: URL dạng ...#cmt=<binId>~<key> → tự nhận cấu hình, lưu, rồi xoá khỏi URL ──
  // Nhờ vậy mở ở máy/browser mới chỉ cần DÁN 1 link là tự nối, không phải gõ Bin ID + Key.
  // Chạy SỚM (trước khi app điều hướng theo hash) để không lẫn với hash tên màn.
  (function importShareLink() {
    try {
      var h = location.hash || '';
      var m = /[#&]cmt=([^&]+)/.exec(h);
      if (!m) return;
      var raw = decodeURIComponent(m[1]);
      var parts = raw.split('~');
      var binId = (parts[0] || '').trim();
      var binKey = (parts[1] || '').trim();
      // Gỡ đoạn cmt=... khỏi hash (giữ lại phần hash khác nếu có, vd tên màn)
      var rest = h.replace(/[#&]cmt=[^&]+/, '').replace(/^#&/, '#').replace(/^#$/, '');
      try { history.replaceState(null, '', location.pathname + location.search + rest); } catch (e) {}

      // LINK HỎNG (thiếu key / key bị cắt ngắn / sai định dạng) → KHÔNG nhận, báo lỗi rõ,
      // và KHÔNG cho review tiếp (tránh việc gõ góp ý xong mới biết không lưu được).
      var eId = validateBinId(binId), eKey = validateBinKey(binKey);
      if (eId || eKey) {
        shareLinkError = (eId || eKey) + ' Hãy xin lại link đầy đủ từ người gửi.';
        return;
      }

      // ĐỔI SANG BIN KHÁC → phải DỌN comment của bin cũ, nếu không chúng sẽ bị đẩy
      // ngược lên bin mới ("đè trùng vô"). Mỗi bin là một không gian góp ý riêng.
      var prev = loadCfg();
      if (prev.binId && prev.binId !== binId) clearLocalComments();   // chỉ dọn file này
      saveCfg({ binId: binId, binKey: binKey });
    } catch (e) {}
  })();

  // ── CHẾ ĐỘ ADMIN: chỉ người mở bằng URL có #admin mới thấy nút Cài đặt (bánh răng),
  //    hướng dẫn, Bin ID/Key. Người review bình thường (nhận link thường) KHÔNG thấy gì
  //    về cấu hình — chỉ dùng comment như bình thường.
  //    Một khi vào chế độ admin, nhớ trên máy đó để lần sau khỏi phải gõ #admin lại.
  var ADMIN_KEY = 'cmt:' + FILE_SCOPE + ':admin';   // vai admin theo TỪNG file
  var isAdmin = (function detectAdmin() {
    try {
      var h = location.hash || '';
      if (/[#&]admin\b/.test(h)) {
        try { localStorage.setItem(ADMIN_KEY, '1'); } catch (e) {}
        // gỡ #admin khỏi URL cho gọn (giữ phần hash khác nếu có)
        var rest = h.replace(/[#&]admin\b/, '').replace(/^#&/, '#').replace(/^#$/, '');
        try { history.replaceState(null, '', location.pathname + location.search + rest); } catch (e) {}
        return true;
      }
      return localStorage.getItem(ADMIN_KEY) === '1';
    } catch (e) { return false; }
  })();

  // ── DANH TÍNH MÁY (ownership): id ổn định của "tôi", KHÔNG đổi khi đổi tên hiển thị.
  //    Dùng để biết comment nào là của mình → chỉ được xoá/copy comment của mình
  //    (admin thì được tất cả). Đây là phân vai tiện dụng cho review nội bộ, KHÔNG phải
  //    bảo mật thật (ai sửa localStorage cũng giả được) — đúng tinh thần "nội bộ".
  var ME_KEY = 'cmt:me';
  var ME = (function () {
    try {
      var v = localStorage.getItem(ME_KEY);
      if (!v) {
        v = 'u' + Math.floor(Math.random() * 2176782336).toString(36) + Date.now().toString(36);
        localStorage.setItem(ME_KEY, v);
      }
      return v;
    } catch (e) { return 'u-anon'; }
  })();

  var _cfg = loadCfg();
  var BIN_ID  = (_cfg.binId  || window.CMT_BIN_ID  || '');   // Bin ID từ jsonbin.io
  var BIN_KEY = (_cfg.binKey || window.CMT_BIN_KEY || '');   // Master Key (lộ trong file — chỉ dùng nội bộ)
  var SYNC_INTERVAL_MS = 15000;               // nhịp kéo comment mới của người khác

  // ════════════════════════════════════════════════════════════════════════
  // FEATURE — tên "ngăn" chứa comment. PHẢI ỔN ĐỊNH, nếu không comment sẽ "biến mất"
  // (thực chất là bị cất vào ngăn khác).
  //
  // BÀI HỌC (bug thật): bản trước dò FEATURE theo chuỗi mềm, cuối cùng rơi vào TÊN FILE.
  // Đổi tên file / đặt ở thư mục khác / host lên URL khác → tên ngăn đổi → mở ra thấy TRỐNG
  // dù dữ liệu vẫn còn nguyên. Nay ưu tiên nguồn TƯỜNG MINH và ổn định:
  //   1) window.CMT_FEATURE   — do người dựng đặt (chắc chắn nhất)
  //   2) giá trị đã lưu lần trước trên máy này (khoá theo bin nếu có) — không đổi theo tên file
  //   3) FEATURE/STORE_KEY của app nếu thực sự đọc được
  //   4) cuối cùng mới tới tên file, và ĐÃ CHỐT lại để lần sau không đổi nữa
  // ════════════════════════════════════════════════════════════════════════
  var FEATURE_LOCK_KEY = 'cmt:' + FILE_SCOPE + ':feature-lock';   // chốt tên ngăn theo TỪNG file
  var FEATURE = '';

  // (1) khai báo tường minh
  try { if (typeof window.CMT_FEATURE === 'string' && window.CMT_FEATURE) FEATURE = window.CMT_FEATURE; } catch (e) {}

  // (2) đã chốt từ lần trước trên máy này → dùng lại, KHÔNG để tên file làm lệch
  if (!FEATURE) {
    try { FEATURE = localStorage.getItem(FEATURE_LOCK_KEY) || ''; } catch (e) {}
  }

  // (3) hỏi app (const FEATURE KHÔNG lên global nên thường không thấy — vẫn thử cho chắc)
  if (!FEATURE) {
    try {
      var g = (0, eval)('typeof FEATURE !== "undefined" ? FEATURE : (typeof STORE_KEY !== "undefined" ? STORE_KEY : "")');
      if (g && typeof g === 'string') {
        var mm = /^proto:(.+):v\d+$/.exec(g);
        FEATURE = mm ? mm[1] : g;
      }
    } catch (e) {}
  }
  // (3b) đọc thẳng từ mã nguồn trang: bắt `const FEATURE = "..."` hoặc `proto:xxx:v1`
  if (!FEATURE) {
    try {
      var html = document.documentElement.innerHTML;
      var m1 = /(?:const|var|let)\s+FEATURE\s*=\s*["']([^"']+)["']/.exec(html);
      if (m1) FEATURE = m1[1];
      else {
        var m2 = /["']proto:([^:"']+):v\d+["']/.exec(html);
        if (m2) FEATURE = m2[1];
      }
    } catch (e) {}
  }

  // (4) hết cách mới lấy tên file — rồi CHỐT lại để lần sau không lệ thuộc tên file nữa
  if (!FEATURE) {
    var f = (location.pathname.split('/').pop() || '').replace(/\.html?$/i, '').replace(/-prototype$/i, '');
    FEATURE = f ? decodeURIComponent(f) : 'prototype';
  }
  try { localStorage.setItem(FEATURE_LOCK_KEY, FEATURE); } catch (e) {}   // chốt: đổi tên file cũng không mất

  var CMT_KEY = 'cmt:' + FILE_SCOPE + ':' + FEATURE + ':v1';   // KEY RIÊNG — reset dữ liệu demo KHÔNG xoá comment

  // uid duy nhất toàn cục (không cần crypto — đủ chống trùng cho vài chục người review)
  var uidCounter = 0;
  function newUid() {
    uidCounter++;
    var rnd = (typeof crypto !== 'undefined' && crypto.getRandomValues)
      ? crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
      : Math.floor(Math.random() * 2176782336).toString(36);
    return 'c' + Date.now().toString(36) + rnd + uidCounter.toString(36);
  }

  // Đưa 1 bản ghi comment về đúng hình dạng mong đợi (bù mọi trường thiếu).
  // Nhờ đó resolveAnchor/positionAll/exportMarkdown KHÔNG cần kiểm null rải rác.
  function normalize(c) {
    var a = (c.anchor && typeof c.anchor === 'object') ? c.anchor : {};
    var fb = (c.fallback && typeof c.fallback === 'object') ? c.fallback : {};
    var sig = (a.sig && typeof a.sig === 'object') ? a.sig : null;
    return {
      // uid = khoá duy nhất TOÀN CỤC (khác id vốn chỉ là số đếm trên 1 máy). Dùng để trộn
      // comment giữa nhiều máy/nhiều tab mà không trùng. id giữ lại cho tương thích cũ.
      uid: (typeof c.uid === 'string' && c.uid) ? c.uid : newUid(),
      id: typeof c.id === 'number' ? c.id : 0,
      n: typeof c.n === 'number' ? c.n : 1,
      screen: typeof c.screen === 'string' ? c.screen : '',
      text: typeof c.text === 'string' ? c.text : '',
      author: typeof c.author === 'string' ? c.author : '',
      owner: typeof c.owner === 'string' ? c.owner : '',   // id máy đã tạo (ownership)
      created: typeof c.created === 'string' ? c.created : '',
      resolved: !!c.resolved,
      anchor: {
        cmtId: a.cmtId || null,
        elId: a.elId || null,
        path: a.path || '',
        sig: sig ? { tag: sig.tag || '', cls: sig.cls || '', text: sig.text || '' } : null,
        rx: typeof a.rx === 'number' && isFinite(a.rx) ? a.rx : 0.5,
        ry: typeof a.ry === 'number' && isFinite(a.ry) ? a.ry : 0.5
      },
      fallback: {
        fx: typeof fb.fx === 'number' && isFinite(fb.fx) ? fb.fx : 0.5,
        fy: typeof fb.fy === 'number' && isFinite(fb.fy) ? fb.fy : 0.25
      }
    };
  }

  // ── Store riêng, tách khỏi store app ──
  var cmt = {
    list: [],
    seq: 0,
    load: function () {
      try {
        var raw = localStorage.getItem(CMT_KEY);
        var parsed = raw ? JSON.parse(raw) : null;
        if (parsed && Array.isArray(parsed.list)) {
          // Chuẩn hoá TỪNG bản ghi: file localStorage có thể cũ/sửa tay/thiếu trường.
          // 1 bản ghi méo mó KHÔNG được phép làm hỏng cả phiên review.
          this.list = parsed.list
            .filter(function (c) { return c && typeof c === 'object'; })
            .map(normalize)
            // Dọn "xác" comment rỗng do bug cũ (bản nháp bị đẩy lên rồi ghi đè mất chữ).
            // Comment không có nội dung thì không còn giá trị review — bỏ cho danh sách sạch.
            .filter(function (c) { return c.text && c.text.trim(); });
          this.seq = parsed.seq || this.list.length;
          // seq phải luôn >= id lớn nhất, nếu không comment mới sẽ trùng id với comment cũ
          this.list.forEach(function (c) { if (c.id > this.seq) this.seq = c.id; }, this);
        }
      } catch (e) { this.list = []; this.seq = 0; }
    },
    // Chỉ lưu xuống localStorage (không đụng remote) — dùng khi trộn dữ liệu về từ remote.
    saveLocal: function () {
      try {
        localStorage.setItem(CMT_KEY, JSON.stringify({ list: this.list, seq: this.seq }));
        this.lastError = null;
        return true;
      } catch (e) {
        this.lastError = e;
        try { console.error('[comment-layer] save failed:', e); } catch (e2) {}
        try { toast('Không lưu được comment — hãy Copy all trước khi đóng tab'); } catch (e3) {}
        return false;
      }
    },
    // Lưu local + đẩy lên máy chủ (nếu đã cấu hình). jsonbin ghi cả bin nên chỉ gọi 1 lần.
    save: function () {
      var okLocal = this.saveLocal();
      if (Remote.on) Remote.push();
      return okLocal;
    }
  };
  cmt.load();

  // ════════════════════════════════════════════════════════════════
  // REMOTE SYNC (jsonbin.io) — tuỳ chọn. Local-first: mọi thao tác vẫn tức thời
  // trên localStorage; backend chỉ là nơi chia sẻ. Chưa cấu hình → module này ngủ.
  //
  // Mô hình: cả danh sách comment lưu trong 1 "bin" (blob JSON) dạng {list:[...]}.
  // Vì ghi cả blob dễ đè nhau khi 2 người ghi gần nhau, mọi lần ĐẨY đều theo trình tự
  // READ → MERGE → WRITE (kéo bản mới nhất trộn vào rồi mới ghi) để không mất comment ai.
  // ════════════════════════════════════════════════════════════════
  var Remote = {
    on: !!(BIN_ID && BIN_KEY),
    base: 'https://api.jsonbin.io/v3/b/' + BIN_ID,
    headers: function () {
      return { 'Content-Type': 'application/json', 'X-Master-Key': BIN_KEY, 'X-Bin-Meta': 'false' };
    },
    // Chỉ lấy comment của ĐÚNG feature này (1 bin có thể chứa nhiều feature nếu muốn).
    // Đồng thời BỎ bản rỗng (xác do bug cũ / nháp của người đang gõ dở) — không kéo về.
    ofFeature: function (list) {
      return (list || []).filter(function (c) {
        if (c.feature && c.feature !== FEATURE) return false;
        return !!(c.text && String(c.text).trim());
      });
    },
    // Kiểm THẬT: gọi thử máy chủ xem Bin ID + Key có dùng được không.
    // cb(ok, httpStatus). Dùng lúc khởi động để chặn sớm, và khi admin bấm Lưu.
    verify: function (cb) {
      if (!this.on) { cb(false, 0); return; }
      fetch(this.base + '/latest', { headers: this.headers() })
        .then(function (res) { cb(res.ok, res.status); })
        .catch(function () { cb(false, -1); });   // -1 = không gọi được (mạng)
    },
    // KÉO bin về, trộn vào local (không đụng bản đang sửa dở, bỏ qua uid đã xoá cục bộ).
    pull: function (done) {
      if (!this.on) { if (done) done(); return; }
      fetch(this.base + '/latest', { headers: this.headers() })
        .then(function (res) { if (!res.ok) { Remote.warn('kéo', res.status); if (done) done(); return null; } return res.json(); })
        .then(function (data) {
          if (data && Array.isArray(data.list)) {
            mergeRemote(Remote.ofFeature(data.list).map(normalize));
            setSyncBadge('ok');
          }
          if (done) done();
        })
        .catch(function () { Remote.warn('kéo'); if (done) done(); });
    },
    // ĐẨY: gộp nhiều lần ghi gần nhau (debounce) + READ-MERGE-WRITE chống đè.
    // _waiters: các callback chờ biết KẾT QUẢ THẬT của lần ghi (để báo "đã lưu" cho user).
    _pending: false,
    _waiters: [],
    onWritten: function (cb) { if (cb) this._waiters.push(cb); },
    _settle: function (ok) {
      var ws = this._waiters; this._waiters = [];
      ws.forEach(function (cb) { try { cb(ok); } catch (e) {} });
    },
    writeAll: function () {
      if (!this.on || this._pending) return;
      this._pending = true;
      var self = this;
      setTimeout(function () {
        self._pending = false;
        fetch(self.base + '/latest', { headers: self.headers() })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            if (data && Array.isArray(data.list)) mergeRemote(Remote.ofFeature(data.list).map(normalize));
            // Gắn feature vào mỗi comment; BỎ bản nháp rỗng (chưa gõ chữ) — không đưa lên máy chủ.
            var out = cmt.list
              .filter(function (c) { return c.text && c.text.trim(); })
              .map(function (c) { var d = {}; for (var k in c) d[k] = c[k]; d.feature = FEATURE; return d; });
            // Giữ lại comment feature KHÁC (nếu bin dùng chung) — không xoá của người ta.
            var others = (data && Array.isArray(data.list)) ? data.list.filter(function (c) { return c.feature && c.feature !== FEATURE; }) : [];
            return fetch(self.base, { method: 'PUT', headers: self.headers(), body: JSON.stringify({ list: others.concat(out) }) });
          })
          .then(function (res) {
            var ok = !!(res && res.ok);
            if (ok) setSyncBadge('ok'); else Remote.warn('đẩy', res && res.status);
            self._settle(ok);
          })
          .catch(function () { Remote.warn('đẩy'); self._settle(false); });
      }, 2000);   // gom 2 giây: sửa/xoá liên tiếp chỉ tốn 1 cặp GET+PUT thay vì nhiều lần
    },
    push: function () { this.writeAll(); },   // đẩy 1 comment = ghi lại cả bin (đã read-merge-write)
    del: function () { this.writeAll(); },    // xoá = ghi lại bin thiếu nó (tombstone chặn kéo-lại)
    warnedAt: 0,
    warn: function (what, code) {
      try { setSyncBadge('err'); } catch (e) {}
      var now = +new Date();
      if (now - this.warnedAt < 20000) return;   // đừng spam toast khi mạng chập chờn
      this.warnedAt = now;
      toast('Không ' + what + ' được comment lên máy chủ' + (code ? ' (' + code + ')' : '') + ' — vẫn lưu tạm trên máy');
    }
  };

  // Trộn danh sách từ remote vào local theo uid: cái mới thì thêm, cái đã có thì lấy
  // bản có nội dung "mới hơn" (so text/resolved). Không đụng comment đang mở sửa dở.
  function mergeRemote(remoteList) {
    var byUid = {};
    cmt.list.forEach(function (c) { byUid[c.uid] = c; });
    var tomb = loadTombstones();   // uid đã xoá trên máy này → không kéo lại
    var changed = 0;
    remoteList.forEach(function (rc) {
      if (tomb[rc.uid]) return;    // đã xoá cục bộ → bỏ qua dù máy chủ còn (backend không cho xoá)
      var local = byUid[rc.uid];
      if (!local) {
        // comment mới của người khác
        if (openId != null && byId(openId) && byId(openId).uid === rc.uid) return;
        rc.id = ++cmt.seq;
        cmt.list.push(rc); byUid[rc.uid] = rc; changed++;
      } else {
        // đã có: cập nhật nếu remote khác (đơn giản: text/resolved/author)
        if (openIsEditing() && openId != null && byId(openId) && byId(openId).uid === rc.uid) return; // đang gõ dở → giữ
        // QUAN TRỌNG: KHÔNG cho nội dung RỖNG từ máy chủ ghi đè nội dung ĐÃ CÓ ở local.
        // Bug thật: bản nháp (text rỗng) bị đẩy lên trước khi user kịp gõ; lần kéo sau
        // bản rỗng đó tràn về xoá sạch chữ của mọi người → danh sách toàn "(trống)".
        var remoteHasText = !!(rc.text && rc.text.trim());
        var localHasText = !!(local.text && local.text.trim());
        if (!remoteHasText && localHasText) {
          // giữ nguyên chữ local; chỉ đồng bộ các trường phụ
          if (local.resolved !== rc.resolved) { local.resolved = rc.resolved; changed++; }
          return;
        }
        if (local.text !== rc.text || local.resolved !== rc.resolved || local.author !== rc.author) {
          local.text = rc.text; local.resolved = rc.resolved; local.author = rc.author;
          changed++;
        }
      }
    });
    if (changed) {
      renumberScreens();
      cmt.saveLocal();      // lưu bản trộn xuống local, KHÔNG đẩy ngược lên (tránh vòng lặp)
      renderList();
      schedule();
      if (typeof onRemoteChange === 'function') onRemoteChange();   // có cái mới → poll nhanh lại
    }
  }

  // đánh lại n cho gọn theo từng màn (dùng sau khi trộn thêm comment từ remote)
  function renumberScreens() {
    var per = {};
    cmt.list.forEach(function (c) {
      per[c.screen] = (per[c.screen] || 0) + 1;
      c.n = per[c.screen];
    });
  }

  function openIsEditing() {
    return !!pop.querySelector && !!pop.querySelector('#cmt-text');
  }

  // Tombstone: uid đã xoá trên máy này. Cần khi backend KHÔNG cho xoá (luật chỉ-thêm) —
  // nếu không, comment vừa xoá sẽ bị lần pull sau kéo lại, gây bối rối.
  var TOMB_KEY = 'cmt:' + FILE_SCOPE + ':' + FEATURE + ':deleted';
  function loadTombstones() {
    try { return JSON.parse(localStorage.getItem(TOMB_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function addTombstone(uid) {
    if (!uid) return;
    var t = loadTombstones(); t[uid] = 1;
    try { localStorage.setItem(TOMB_KEY, JSON.stringify(t)); } catch (e) {}
  }

  var onRemoteChange = null;   // gán ở phần đồng bộ: báo "có thay đổi" để poll nhanh lại

  // ── Trạng thái runtime (KHÔNG persist) ──
  var visible = true;      // Show/Hide comments
  var picking = false;     // đang ở chế độ chọn element để ghim
  var openId = null;       // id comment đang mở popover

  // ════════════════════════════════════════════════════════════════
  // ANCHOR — chuỗi 3 tầng: data-cmt > id > selector path; kèm %-offset dự phòng
  // ════════════════════════════════════════════════════════════════

  // Sinh selector path nth-of-type, dừng ở section màn (không leo ra ngoài app)
  function selectorPath(el, root) {
    var parts = [];
    var node = el;
    while (node && node !== root && node.nodeType === 1) {
      var part = node.tagName.toLowerCase();
      var parent = node.parentElement;
      if (!parent) break;
      var same = [];
      for (var i = 0; i < parent.children.length; i++) {
        if (parent.children[i].tagName === node.tagName) same.push(parent.children[i]);
      }
      if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
      parts.unshift(part);
      node = parent;
    }
    return parts.join(' > ');
  }

  // Chữ ký nội dung — dùng để chấm điểm ứng viên khi selector path trượt
  function signature(el) {
    var txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    return {
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class') || '').trim(),
      text: txt
    };
  }

  // Xây anchor lúc ghim
  function buildAnchor(el, section, clientX, clientY) {
    var r = el.getBoundingClientRect();
    return {
      cmtId: el.getAttribute('data-cmt') || null,
      elId: el.id || null,
      path: selectorPath(el, section),
      sig: signature(el),
      // offset tương đối TRONG bounding box của element (0..1) — responsive-safe
      rx: r.width ? (clientX - r.left) / r.width : 0.5,
      ry: r.height ? (clientY - r.top) / r.height : 0.5
    };
  }

  // Giải anchor → element hiện tại (chạy mỗi lần định vị lại)
  function resolveAnchor(a, section) {
    if (!section) return null;
    var el = null;
    // Tầng 1: data-cmt (bền nhất — sống sót cả khi innerHTML viết lại, miễn template giữ attr)
    if (a.cmtId) {
      el = section.querySelector('[data-cmt="' + cssEscape(a.cmtId) + '"]');
      if (el) return el;
    }
    // Tầng 2: id
    if (a.elId) {
      el = section.querySelector('#' + cssEscape(a.elId));
      if (el) return el;
    }
    // Tầng 3: selector path — CHỈ nhận khi fingerprint còn khớp mạnh.
    // Selector path vẫn resolve được sau khi element gốc bị xoá (trỏ sang sibling khác cùng vị trí)
    // → nếu nhận bừa sẽ gắn comment vào NHẦM element mà không ai biết. Đây là chế độ hỏng
    // nguy hiểm nhất, nên thà báo "mất neo" còn hơn im lặng sai.
    if (a.path) {
      try { el = section.querySelector(a.path); } catch (e) { el = null; }
      if (el && scoreMatch(el, a.sig) >= STRONG_MATCH) return el;
    }
    // Tầng 4: dò theo chữ ký nội dung (DOM đã đổi cấu trúc)
    return bestBySignature(a.sig, section);
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/["\\\]\[#.:>~+*^$|()=\s]/g, '\\$&');
  }

  // Điểm tối đa = 7 (tag 2 + class 2 + text 3). Ngưỡng 5 nghĩa là:
  // phải khớp text nguyên vẹn (3) + ít nhất tag hoặc class (2). Chỉ trùng tag+class
  // mà khác text (4) KHÔNG đủ — đó chính là 2 nút giống nhau khác nhãn.
  var STRONG_MATCH = 5;

  function scoreMatch(el, sig) {
    if (!sig) return 1;
    var s = 0;
    if (el.tagName.toLowerCase() === sig.tag) s += 2;
    var cls = (el.getAttribute('class') || '').trim();
    if (cls && cls === sig.cls) s += 2;
    var txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (sig.text && txt === sig.text) s += 3;
    else if (sig.text && txt && (txt.indexOf(sig.text) === 0 || sig.text.indexOf(txt) === 0)) s += 1;
    return s;
  }

  function bestBySignature(sig, section) {
    if (!sig) return null;
    var all = section.querySelectorAll(sig.tag || '*');
    var best = null, bestScore = 0;
    for (var i = 0; i < all.length; i++) {
      if (all[i].closest('.cmt-layer')) continue;   // không bắt vào chính overlay
      var sc = scoreMatch(all[i], sig);
      if (sc > bestScore) { bestScore = sc; best = all[i]; }
    }
    return bestScore >= STRONG_MATCH ? best : null;   // thà mất neo còn hơn gắn nhầm element
  }

  // ════════════════════════════════════════════════════════════════
  // DOM: overlay + thanh công cụ + popover
  // ════════════════════════════════════════════════════════════════
  var style = document.createElement('style');
  style.textContent = [
    // Overlay phủ .proto-app — pin vẽ trong đây, KHÔNG chèn vào element app
    '.cmt-layer{position:absolute;inset:0;pointer-events:none;z-index:600;overflow:hidden}',
    // Lớp phủ bắt click khi ghim (chỉ hiện lúc picking). z cao hơn pin để bắt trọn.
    '.cmt-pickoverlay{position:absolute;inset:0;z-index:650;display:none;cursor:crosshair}',
    '.cmt-picking .cmt-pickoverlay{display:block}',
    '.cmt-pin{position:absolute;width:26px;height:26px;border-radius:50% 50% 50% 2px;',
    'background:#ff6b2c;color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);',
    'font:700 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;',
    'align-items:center;justify-content:center;cursor:pointer;pointer-events:auto;',
    'transform:translate(-3px,-26px);transition:transform .12s}',
    '.cmt-pin:hover{transform:translate(-3px,-26px) scale(1.12)}',
    '.cmt-pin.resolved{background:#9aa4ae}',
    '.cmt-pin.lost{background:#8e44ad}',
    '.cmt-layer.hidden{display:none}',
    // Chế độ chọn element
    '.cmt-picking .proto-app *{cursor:crosshair !important}',
    '.cmt-hl{outline:2px dashed #ff6b2c !important;outline-offset:1px}',
    // Thanh công cụ (lớp VỎ chrome — neutral, KHÔNG dùng token app)
    // ── Thanh công cụ GỌN: 1 nút tròn + menu bật lên (không chiếm chỗ trên mobile) ──
    // Đặt góc dưới-TRÁI để không đè FAB điều hướng của prototype (thường ở dưới-phải).
    '.cmt-bar{position:fixed;left:16px;bottom:16px;z-index:905;',
    'font:500 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#000}',
    // Thanh MỞ RỘNG: nút tròn + hàng nút nhanh nằm cạnh nhau trong 1 "viên thuốc"
    '.cmt-bar{display:flex;align-items:center;gap:8px}',
    '.cmt-quick{display:flex;align-items:center;gap:4px;background:#fff;border:1px solid #e0e0e0;',
    'border-radius:999px;padding:5px;box-shadow:0 4px 18px rgba(0,0,0,.16)}',
    '.cmt-bar.collapsed .cmt-quick{display:none}',      // thu gọn → giấu hàng nút nhanh
    '.cmt-qbtn{display:flex;align-items:center;gap:6px;font:600 13px/1 inherit;color:#111;',
    'background:none;border:none;border-radius:999px;padding:8px 10px;cursor:pointer}',
    '.cmt-qbtn:hover{background:#f0f0f0}',
    '.cmt-qbtn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.9}',
    '.cmt-qbtn[disabled]{opacity:.4;cursor:not-allowed}',
    '.cmt-qmain{background:#111;color:#fff;padding:8px 14px}',
    '.cmt-qmain:hover{background:#333}',
    '.cmt-qmain.on{background:#ff6b2c}',                 // đang ở chế độ chọn phần tử
    '.cmt-qbtn b{font:700 11px/1 inherit;color:#777;background:#f0f0f0;border-radius:999px;padding:3px 6px}',
    '.cmt-qcollapse{color:#999;padding:8px 6px}',
    '.cmt-fab{position:relative;width:44px;height:44px;border-radius:50%;border:none;',
    'background:#111;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;',
    'box-shadow:0 4px 16px rgba(0,0,0,.3);padding:0}',
    '.cmt-fab svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:1.8}',
    '.cmt-fab.on{background:#333}',
    '.cmt-fab:hover{background:#000}',
    // số comment hiển thị ngay trên nút tròn
    '.cmt-fabcount{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;padding:0 4px;',
    'border-radius:999px;background:#ff6b2c;color:#fff;font:700 10px/18px -apple-system,sans-serif;',
    'text-align:center;border:2px solid #fff;box-sizing:content-box}',
    '.cmt-fabcount.zero{display:none}',
    // chấm trạng thái đồng bộ nhỏ ở góc dưới nút
    '.cmt-fabdot{position:absolute;bottom:-1px;left:-1px;width:11px;height:11px;border-radius:50%;',
    'border:2px solid #fff;display:none}',
    '.cmt-fabdot.cmt-sync-ok{background:#1a7f37;display:block}',
    '.cmt-fabdot.cmt-sync-syncing{background:#d4a72c;display:block}',
    '.cmt-fabdot.cmt-sync-err,.cmt-fabdot.cmt-sync-error{background:#e53935;display:block}',
    // menu bật lên từ nút
    '.cmt-menu{position:absolute;left:0;bottom:54px;min-width:210px;background:#fff;color:#000;',
    'border:1px solid #ddd;border-radius:12px;box-shadow:0 10px 34px rgba(0,0,0,.22);',
    'padding:6px;display:none;flex-direction:column;gap:1px}',
    '.cmt-menu.open{display:flex}',
    '.cmt-mi{display:flex;align-items:center;gap:9px;width:100%;text-align:left;font:inherit;',
    'font-weight:600;background:none;border:none;border-radius:8px;padding:10px 11px;cursor:pointer;color:#111}',
    '.cmt-mi:hover{background:#f2f2f2}',
    '.cmt-mi[disabled]{opacity:.4;cursor:not-allowed}',
    '.cmt-mi svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;flex:none}',
    '.cmt-mi span{flex:1}',
    '.cmt-mi b{font:700 11px/1 inherit;color:#777;background:#f0f0f0;border-radius:999px;padding:3px 7px}',
    '.cmt-mi.on{background:#111;color:#fff}',
    '.cmt-mi-sub{font-weight:500;color:#555;font-size:12px}',
    '.cmt-mi-sub svg{width:14px;height:14px}',
    '.cmt-msep{height:1px;background:#eee;margin:5px 4px}',
    '.cmt-whoname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    // mobile: menu không tràn màn
    '@media (max-width:560px){.cmt-menu{min-width:200px;max-width:calc(100vw - 32px)}}',
    // Popover
    '.cmt-pop{position:fixed;z-index:910;width:300px;max-width:calc(100vw - 24px);background:#fff;',
    'border:1px solid #000;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.28);',
    'font:400 13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#000;display:none}',
    '.cmt-pop.open{display:block}',
    '.cmt-pop header{display:flex;align-items:center;gap:6px;padding:9px 11px;border-bottom:1px solid #ddd}',
    '.cmt-pop header b{font-size:12px}',
    '.cmt-pop header .meta{color:#777;font-size:11px;margin-left:auto}',
    '.cmt-pop .body{padding:10px 11px}',
    '.cmt-pop textarea{width:100%;min-height:74px;resize:vertical;font:inherit;padding:8px;',
    'border:1px solid #ccc;border-radius:6px;color:#000;background:#fff}',
    '.cmt-pop textarea:focus{outline:none;border-color:#000}',
    '.cmt-pop .target{font-size:11px;color:#777;margin-top:7px;word-break:break-all}',
    '.cmt-pop .target.lost{color:#8e44ad;font-weight:600}',
    '.cmt-pop footer{display:flex;gap:6px;padding:9px 11px;border-top:1px solid #ddd;flex-wrap:wrap}',
    '.cmt-pop footer button{font:600 12px/1 inherit;border:1px solid #ccc;background:#fff;color:#000;',
    'border-radius:6px;padding:7px 11px;cursor:pointer}',
    '.cmt-pop footer button.primary{background:#000;color:#fff;border-color:#000}',
    '.cmt-pop footer button.danger{color:#c0392b;border-color:#e8b9b3}',
    '.cmt-pop footer button:hover{background:#f0f0f0}',
    '.cmt-pop footer button.primary:hover{background:#333}',
    '.cmt-pop .saved-text{white-space:pre-wrap;word-break:break-word}',
    // Danh sách comment
    '.cmt-list{position:fixed;right:20px;bottom:84px;z-index:906;width:330px;',
    'max-width:calc(100vw - 40px);max-height:calc(100vh - 160px);background:#fff;border:1px solid #000;',
    'border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.25);display:none;flex-direction:column;',
    'font:400 13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#000}',
    '.cmt-list.open{display:flex}',
    '.cmt-list header{display:flex;align-items:center;padding:11px 13px;border-bottom:1px solid #ddd}',
    '.cmt-list header b{font-size:13px}',
    '.cmt-list header .close{margin-left:auto;border:none;background:none;font-size:17px;cursor:pointer;color:#000}',
    '.cmt-list .items{overflow-y:auto;padding:6px 0}',
    '.cmt-item{padding:9px 13px;border-bottom:1px solid #f0f0f0;cursor:pointer}',
    '.cmt-item:hover{background:#f6f6f6}',
    '.cmt-item .h{display:flex;gap:6px;align-items:center;font-size:11px;color:#777}',
    '.cmt-item .n{background:#ff6b2c;color:#fff;border-radius:50%;width:17px;height:17px;',
    'display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex:none}',
    '.cmt-item.resolved .n{background:#9aa4ae}',
    '.cmt-item .t{margin-top:4px;white-space:pre-wrap;word-break:break-word}',
    '.cmt-item.resolved .t{text-decoration:line-through;color:#888}',
    '.cmt-empty{padding:20px 13px;color:#777;font-size:12px;text-align:center}',
    '.cmt-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:74px;z-index:920;',
    'background:#000;color:#fff;padding:8px 14px;border-radius:999px;font:600 12px/1 -apple-system,sans-serif;',
    'opacity:0;transition:opacity .2s;pointer-events:none}',
    '.cmt-toast.show{opacity:1}',
    // Chip tên trên thanh công cụ
    // Hộp thoại nhập tên
    '.cmt-idback{position:fixed;inset:0;z-index:960;background:rgba(0,0,0,.45);',
    'display:flex;align-items:center;justify-content:center;padding:20px;',
    'font:400 14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '.cmt-idbox{background:#fff;color:#000;border-radius:14px;padding:22px;max-width:360px;width:100%;',
    'box-shadow:0 20px 60px rgba(0,0,0,.35)}',
    '.cmt-idbox h3{font-size:18px;margin:0 0 6px}',
    '.cmt-idbox p{font-size:13px;color:#666;margin:0 0 14px}',
    '.cmt-idname{width:100%;font:inherit;padding:11px 12px;border:1px solid #ccc;border-radius:8px;',
    'color:#000;background:#fff}',
    '.cmt-idname:focus{outline:none;border-color:#000}',
    '.cmt-idname.cmt-idempty{border-color:#e53935;background:#fff6f6}',
    '.cmt-idrow{margin-top:14px;text-align:right}',
    '.cmt-idok{font:600 14px inherit;background:#000;color:#fff;border:none;border-radius:8px;',
    'padding:10px 18px;cursor:pointer}',
    '.cmt-idok:hover{background:#333}',
    // Nút bánh răng trên thanh công cụ
    // Hộp thoại cài đặt (rộng hơn hộp tên)
    '.cmt-setbox{max-width:440px}',
    '.cmt-setstat{font-size:12px;padding:8px 10px;border-radius:8px;margin:2px 0 12px}',
    '.cmt-setstat.on{background:#e7f6ec;color:#1a7f37}',
    '.cmt-setstat.off{background:#f4f4f4;color:#666}',
    '.cmt-help{margin-bottom:12px;font-size:12px}',
    '.cmt-help summary{cursor:pointer;color:#333;font-weight:600;padding:4px 0}',
    '.cmt-steps{margin:6px 0 0 18px;padding:0;color:#555;line-height:1.6}',
    '.cmt-steps li{margin-bottom:4px}',
    '.cmt-schema{display:flex;align-items:center;gap:6px;margin:4px 0;background:#f6f6f6;',
    'border:1px solid #ddd;border-radius:6px;padding:6px 8px}',
    '.cmt-schema code{font:12px/1.3 ui-monospace,Menlo,monospace;color:#111;flex:1;word-break:break-all}',
    '.cmt-schema button{font:600 11px inherit;border:1px solid #ccc;background:#fff;border-radius:5px;',
    'padding:4px 8px;cursor:pointer}',
    '.cmt-schema button:hover{border-color:#000}',
    '.cmt-setlabel{display:block;font-size:12px;font-weight:600;color:#444;margin:8px 0 4px}',
    '.cmt-setinput{width:100%;font:13px ui-monospace,Menlo,monospace;padding:9px 10px;',
    'border:1px solid #ccc;border-radius:8px;color:#000;background:#fff}',
    '.cmt-setinput:focus{outline:none;border-color:#000}',
    '.cmt-setinput.cmt-setinput-bad{border-color:#e53935;background:#fff6f6}',
    '.cmt-seterr{display:none;font-size:11px;color:#c62828;margin-top:4px;line-height:1.4}',
    '.cmt-seterr.show{display:block}',
    '.cmt-setnote{font-size:11px;color:#999;margin:8px 0 0;line-height:1.4}',
    '.cmt-setrow{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}',
    '.cmt-setghost{font:600 13px inherit;background:#fff;color:#000;border:1px solid #ccc;',
    'border-radius:8px;padding:9px 14px;cursor:pointer}',
    '.cmt-setghost:hover{border-color:#000}',
    '.cmt-setdanger{color:#a40e26;border-color:#e8b9b3}',
    '.cmt-setdanger:hover{border-color:#a40e26;background:#fdf2f2}',
    '.cmt-sethr{border:none;border-top:1px solid #eee;margin:14px 0}',
    // Xem trước nội dung copy
    '.cmt-cppreview{margin-top:12px;padding:10px;background:#f7f7f7;border:1px solid #e0e0e0;',
    'border-radius:8px;font:11px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;',
    'max-height:200px;overflow:auto;color:#333}',
    // Ghi chú comment của người khác (không có nút sửa/xoá)
    '.cmt-ofother{font-size:11px;color:#999;align-self:center;margin-left:auto}',
    '.cmt-sharebox{margin-top:12px;padding:12px;background:#f0f7f0;border:1px solid #cfe6cf;border-radius:8px}',
    '.cmt-sharehead{font-size:12px;font-weight:700;color:#1a7f37}',
    '.cmt-sharenote{font-size:11px;color:#4a7a4a;margin:4px 0 8px;line-height:1.4}',
    '.cmt-sharebox .cmt-idok{width:100%}',
    // Nhãn trạng thái đồng bộ
    '.cmt-sync-err,.cmt-sync-error{color:#a40e26}.cmt-sync-err::before,.cmt-sync-error::before{background:#a40e26}'
  ].join('');
  document.head.appendChild(style);

  var app = document.querySelector('.proto-app');
  if (!app) return;                       // vật chủ không hợp lệ → không bật comment
  if (getComputedStyle(app).position === 'static') app.style.position = 'relative';

  var layer = document.createElement('div');
  layer.className = 'cmt-layer';
  app.appendChild(layer);

  // Lớp phủ BẮT click khi đang ghim — chỉ hiện lúc picking. Nhờ nó nằm TRÊN cùng,
  // click luôn tới được nó kể cả khi phía dưới là nút/ô ĐANG disabled (disabled element
  // KHÔNG tự phát sự kiện chuột → nếu bắt trực tiếp sẽ không ghim được lên chúng).
  var pickOverlay = document.createElement('div');
  pickOverlay.className = 'cmt-pickoverlay';
  app.appendChild(pickOverlay);

  var bar = document.createElement('div');
  bar.className = 'cmt-bar';
  // ── THANH CÔNG CỤ 2 TRẠNG THÁI: MỞ RỘNG (desktop) và THU GỌN (mobile) ──
  // Desktop rộng chỗ → bày sẵn nút hay dùng nhất ("Thêm góp ý") để bấm 1 phát là ghim,
  // không phải mở menu rồi mới chọn. Mobile hẹp → thu về 1 nút tròn cho đỡ chiếm chỗ.
  // Người dùng tự bấm mũi tên để đổi, và lựa chọn đó được nhớ lại.
  var BAR_MODE_KEY = 'cmt:' + FILE_SCOPE + ':barmode';
  function defaultBarMode() {
    try { return (window.innerWidth || 1024) >= 720 ? 'expanded' : 'collapsed'; }
    catch (e) { return 'expanded'; }
  }
  function getBarMode() {
    try { return localStorage.getItem(BAR_MODE_KEY) || defaultBarMode(); }
    catch (e) { return defaultBarMode(); }
  }
  function setBarMode(mode) {
    try { localStorage.setItem(BAR_MODE_KEY, mode); } catch (e) {}
    bar.classList.toggle('collapsed', mode === 'collapsed');
    if (mode === 'collapsed') toggleCmtMenu(false);
    var t = document.getElementById('cmt-collapse');
    if (t) t.title = mode === 'collapsed' ? 'Mở rộng thanh góp ý' : 'Thu gọn thanh góp ý';
  }

  bar.innerHTML =
    // Nút tròn: khi THU GỌN là cửa vào duy nhất; khi MỞ RỘNG nó nằm đầu thanh
    '<button id="cmt-fab" class="cmt-fab" title="Góp ý">' +
      '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 01-9 8.4 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 013 11.5a8.4 8.4 0 019-8.4 8.4 8.4 0 019 8.4z"/></svg>' +
      '<span class="cmt-fabcount" id="cmt-count">0</span>' +
      '<span class="cmt-fabdot" id="cmt-sync" title="Trạng thái đồng bộ"></span>' +
    '</button>' +
    // Hàng nút NHANH — chỉ hiện khi MỞ RỘNG (1 chạm là thêm góp ý)
    '<div class="cmt-quick" id="cmt-quick">' +
      '<button class="cmt-qbtn cmt-qmain" id="cmt-add-quick" title="Ghim góp ý mới">' +
        '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>Thêm góp ý</span></button>' +
      '<button class="cmt-qbtn" id="cmt-list-quick" title="Danh sách góp ý">' +
        '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg><b id="cmt-qcount">0</b></button>' +
      '<button class="cmt-qbtn" id="cmt-more" title="Thêm lựa chọn">' +
        '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></button>' +
      '<button class="cmt-qbtn cmt-qcollapse" id="cmt-collapse" title="Thu gọn thanh góp ý">' +
        '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>' +
    '</div>' +
    '<div class="cmt-menu" id="cmt-menu">' +
      '<button class="cmt-mi" id="cmt-add"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>Thêm góp ý</span></button>' +
      '<button class="cmt-mi" id="cmt-listbtn"><svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg><span>Danh sách</span><b id="cmt-mcount">0</b></button>' +
      '<button class="cmt-mi" id="cmt-toggle"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span id="cmt-toggle-label">Ẩn ghim</span></button>' +
      '<button class="cmt-mi" id="cmt-copy"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg><span>' + (isAdmin ? 'Copy góp ý...' : 'Copy góp ý của tôi') + '</span></button>' +
      '<div class="cmt-msep"></div>' +
      '<button class="cmt-mi cmt-mi-sub" id="cmt-whoami"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg><span class="cmt-whoname">Ẩn danh</span></button>' +
      (isAdmin
        ? '<button class="cmt-mi cmt-mi-sub" id="cmt-settings"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg><span>Cài đặt</span></button>'
        : '') +
    '</div>';
  document.body.appendChild(bar);

  // Bật/tắt menu
  function toggleCmtMenu(force) {
    var m = document.getElementById('cmt-menu');
    var open = force === undefined ? !m.classList.contains('open') : force;
    m.classList.toggle('open', open);
    document.getElementById('cmt-fab').classList.toggle('on', open);
  }
  // Nút tròn: THU GỌN → mở rộng thanh ra (đỡ phải qua menu). MỞ RỘNG → xoè menu đầy đủ.
  document.getElementById('cmt-fab').onclick = function (e) {
    e.stopPropagation();
    if (bar.classList.contains('collapsed')) { setBarMode('expanded'); return; }
    toggleCmtMenu();
  };
  // Mũi tên: thu gọn lại
  document.getElementById('cmt-collapse').onclick = function (e) {
    e.stopPropagation(); setBarMode('collapsed');
  };
  // "..." → mở menu đầy đủ
  document.getElementById('cmt-more').onclick = function (e) { e.stopPropagation(); toggleCmtMenu(); };
  // bấm ra ngoài → đóng menu
  document.addEventListener('mousedown', function (e) {
    var m = document.getElementById('cmt-menu');
    if (!m || !m.classList.contains('open')) return;
    if (m.contains(e.target) || e.target.closest('#cmt-fab') || e.target.closest('#cmt-more')) return;
    toggleCmtMenu(false);
  });

  var pop = document.createElement('div');
  pop.className = 'cmt-pop';
  document.body.appendChild(pop);

  var listBox = document.createElement('div');
  listBox.className = 'cmt-list';
  listBox.innerHTML = '<header><b>Comments</b><button class="close" aria-label="Đóng">✕</button></header><div class="items" id="cmt-items"></div>';
  document.body.appendChild(listBox);

  var toastEl = document.createElement('div');
  toastEl.className = 'cmt-toast';
  document.body.appendChild(toastEl);

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }

  // ════════════════════════════════════════════════════════════════
  // ĐỊNH VỊ PIN — tính lại từ getBoundingClientRect, KHÔNG chèn vào element app
  // ════════════════════════════════════════════════════════════════
  // Màn đầu tiên trong tài liệu — dùng làm phương án cuối khi không xác định được màn active
  var SCREEN_FALLBACK = (function () {
    var s = document.querySelector('[data-screen]');
    return s ? s.getAttribute('data-screen') : '';
  })();

  function currentScreenSlug() {
    var s = document.querySelector('[data-screen].active');
    return s ? s.getAttribute('data-screen') : null;
  }

  function positionAll() {
    var slug = currentScreenSlug();
    var section = slug ? document.querySelector('[data-screen="' + cssEscape(slug) + '"]') : null;
    var appRect = app.getBoundingClientRect();
    var mine = cmt.list.filter(function (c) { return c.screen === slug; });

    // đồng bộ số pin trong overlay với số comment của màn hiện tại
    var pins = layer.querySelectorAll('.cmt-pin');
    for (var i = pins.length - 1; i >= 0; i--) {
      var keep = mine.some(function (c) { return String(c.id) === pins[i].dataset.cid; });
      if (!keep) pins[i].remove();
    }

    mine.forEach(function (c) {
      var pin = layer.querySelector('.cmt-pin[data-cid="' + cssEscape(String(c.id)) + '"]');
      if (!pin) {
        pin = document.createElement('div');
        pin.className = 'cmt-pin';
        pin.dataset.cid = String(c.id);
        pin.addEventListener('click', function (e) {
          e.stopPropagation();
          if (picking) setPicking(false);   // bấm pin cũ = ý muốn xem nó, không phải ghim tiếp
          openPopover(c.id);
        });
        layer.appendChild(pin);
      }
      pin.textContent = c.n;
      pin.classList.toggle('resolved', !!c.resolved);

      var el = resolveAnchor(c.anchor, section);
      var lost = !el;
      pin.classList.toggle('lost', lost);
      pin.title = (lost ? '[Mất neo] ' : '') + '#' + c.n + ' — ' + (c.text || '(trống)').slice(0, 80);

      var x, y;
      if (el) {
        var r = el.getBoundingClientRect();
        // element bị ẩn (display:none) → rect 0 → coi như mất neo, treo theo %-fallback màn
        if (r.width === 0 && r.height === 0) {
          lost = true;
          pin.classList.add('lost');
        } else {
          // Kẹp điểm neo về gần MÉP element thay vì giữa: pin ngồi ở rìa, không che nhãn/nội dung
          // (giữ nguyên rx/ry đã lưu để vẫn phân biệt được click trái/phải, chỉ hạn chế biên độ).
          var rx = c.anchor.rx != null ? c.anchor.rx : 0.5;
          var ry = c.anchor.ry != null ? c.anchor.ry : 0.5;
          x = r.left - appRect.left + r.width * Math.min(Math.max(rx, 0.06), 0.94);
          y = r.top - appRect.top + r.height * 0.12;   // bám mép trên — pin nở lên trên, không đè chữ
        }
      }
      if (lost) {
        // dự phòng: đặt theo % của khung app (vẫn thấy được, đánh dấu màu khác)
        x = appRect.width * (c.fallback ? c.fallback.fx : 0.5);
        y = appRect.height * (c.fallback ? c.fallback.fy : 0.25);
      }
      // Ẩn pin khi điểm neo cuộn khuất khỏi vùng nhìn thấy của section (giao section ∩ app)
      var vis = x >= -8 && x <= appRect.width + 8 && y >= -8 && y <= appRect.height + 8;
      if (vis && el && section) {
        var sr = section.getBoundingClientRect();
        var vx = appRect.left + x, vy = appRect.top + y;
        if (vy < sr.top - 8 || vy > sr.bottom + 8 || vx < sr.left - 8 || vx > sr.right + 8) vis = false;
      }
      pin.style.display = vis ? 'flex' : 'none';
      pin.style.left = Math.round(x) + 'px';
      pin.style.top = Math.round(y) + 'px';
    });

    // popover đang mở thì bám theo pin
    if (openId != null) placePopover(openId);
  }

  // rAF-throttle: gom mọi yêu cầu định vị lại vào 1 frame (chống layout thrashing)
  var rafPending = false;
  function schedule() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () { rafPending = false; positionAll(); });
  }

  // ── Nguồn kích hoạt định vị lại ──
  window.addEventListener('resize', schedule);
  window.addEventListener('scroll', schedule, true);        // capture: bắt cả cuộn trong [data-screen]
  if (window.visualViewport) {                              // zoom / bàn phím mobile
    visualViewport.addEventListener('resize', schedule);
    visualViewport.addEventListener('scroll', schedule);
  }
  // ảnh/font tải muộn làm layout shift → pin lệch nếu không đo lại
  window.addEventListener('load', schedule);
  document.addEventListener('load', schedule, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(schedule);
    ro.observe(app);
  }
  if (window.MutationObserver) {
    // Quan sát app nhưng BỎ QUA thay đổi trong .cmt-layer (chống tự kích hoạt vòng lặp)
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        if (t && t.nodeType === 1 && t.closest && t.closest('.cmt-layer')) continue;
        schedule();
        return;
      }
    });
    mo.observe(app, { childList: true, subtree: true, attributes: true, characterData: true });
  }

  // ════════════════════════════════════════════════════════════════
  // GHIM COMMENT MỚI — click chọn element, chặn hành vi app
  // ════════════════════════════════════════════════════════════════
  var lastHl = null;
  function setPicking(on) {
    picking = on;
    document.body.classList.toggle('cmt-picking', on);
    var a = document.getElementById('cmt-add');
    if (a) a.classList.toggle('on', on);
    var aq = document.getElementById('cmt-add-quick');   // nút nhanh trên thanh mở rộng
    if (aq) {
      aq.classList.toggle('on', on);
      var s = aq.querySelector('span');
      if (s) s.textContent = on ? 'Chọn phần tử...' : 'Thêm góp ý';
    }
    if (!on && lastHl) { lastHl.classList.remove('cmt-hl'); lastHl = null; }
    if (on) { closePopover(); toast('Click vào phần tử muốn góp ý (Esc để huỷ)'); }
  }

  // Tìm phần tử app THẬT nằm dưới điểm (x,y) — bỏ qua lớp phủ bắt-click + overlay pin.
  // Dùng elementsFromPoint nên "nhìn xuyên" được lớp phủ VÀ bắt được cả nút disabled bên dưới.
  function targetAtPoint(x, y) {
    var stack = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
    for (var i = 0; i < stack.length; i++) {
      var n = stack[i];
      if (!n) continue;
      if (n.closest && n.closest('.cmt-pickoverlay, .cmt-layer, .cmt-bar, .cmt-pop, .cmt-list')) continue;
      if (!app.contains(n)) continue;
      return pickTarget(n);
    }
    return null;
  }

  // Hover highlight khi ghim — lấy từ điểm chuột (qua overlay), không từ e.target (là overlay).
  pickOverlay.addEventListener('mousemove', function (e) {
    if (!picking) return;
    var el = targetAtPoint(e.clientX, e.clientY);
    if (el === lastHl) return;
    if (lastHl) lastHl.classList.remove('cmt-hl');
    lastHl = el;
    if (el) el.classList.add('cmt-hl');
  });

  // Chọn phần tử mục tiêu hợp lý: bỏ overlay, nâng lên ancestor có nghĩa, không lấy cả section
  var SEMANTIC = 'button,a,input,select,textarea,label,img,h1,h2,h3,h4,p,li,td,th,[role],[data-cmt]';
  function pickTarget(node) {
    if (!node || node.nodeType !== 1) return null;
    if (node.closest('.cmt-layer, .cmt-bar, .cmt-pop, .cmt-list')) return null;
    if (node === app || node === document.body || node === document.documentElement) return null;

    // 1) ancestor gần nhất có data-cmt (anchor bền nhất) — ưu tiên tuyệt đối
    var stable = node.closest('[data-cmt]');
    if (stable && app.contains(stable)) return stable;

    // 2) click vào <path>/<use> trong svg → nâng lên control chứa nó
    var el = node;
    if (el.ownerSVGElement || el.tagName.toLowerCase() === 'svg') {
      var ctrl = el.closest(SEMANTIC);
      if (ctrl && app.contains(ctrl)) el = ctrl;
      else if (el.ownerSVGElement) el = el.ownerSVGElement;
    }

    // 3) node quá "trơ" (span/div bọc, không text riêng) → nâng lên semantic gần nhất
    var tag = el.tagName.toLowerCase();
    if ((tag === 'span' || tag === 'div' || tag === 'b' || tag === 'i' || tag === 'small')) {
      var sem = el.closest(SEMANTIC);
      if (sem && app.contains(sem) && !sem.hasAttribute('data-screen')) el = sem;
    }

    // 4) không bao giờ chọn cả section màn hoặc khung app
    if (el.hasAttribute && el.hasAttribute('data-screen')) return null;
    if (el === app) return null;
    return el;
  }

  // Click trên LỚP PHỦ (chỉ hiện khi ghim) → ghim comment tại phần tử dưới điểm click.
  // Vì overlay nằm trên, click KHÔNG chạm tới nút app (không kích hoạt app) VÀ ghim được
  // cả lên nút/ô đang disabled ở dưới (giải bằng elementsFromPoint theo toạ độ).
  pickOverlay.addEventListener('click', function (e) {
    if (!picking) return;
    e.preventDefault();
    e.stopPropagation();
    // Bấm trúng 1 pin đã có (đang bị overlay che) → mở comment đó thay vì ghim đè lên.
    var overPin = pinAtPoint(e.clientX, e.clientY);
    if (overPin) { setPicking(false); openPopover(parseInt(overPin.dataset.cid, 10)); return; }
    var el = targetAtPoint(e.clientX, e.clientY);
    if (!el) { toast('Chọn một phần tử bên trong màn hình'); return; }
    createComment(el, e.clientX, e.clientY);
    setPicking(false);
  });

  // Có pin nào phủ điểm (x,y) không? (pin bị overlay che nên phải dò bằng hình học)
  function pinAtPoint(x, y) {
    var pins = layer.querySelectorAll('.cmt-pin');
    for (var i = 0; i < pins.length; i++) {
      if (pins[i].style.display === 'none') continue;
      var r = pins[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return pins[i];
    }
    return null;
  }

  // Esc vẫn thoát chế độ ghim
  document.addEventListener('keydown', function (e) {
    if (picking && e.key === 'Escape') { setPicking(false); }
  }, true);

  function createComment(el, cx, cy) {
    // Không có màn nào active (app đang vẽ lại) → suy ra màn từ chính phần tử được click.
    // Nếu để slug = null, comment sẽ không bao giờ hiện pin và trùng số với comment màn khác.
    var slug = currentScreenSlug();
    if (!slug) {
      var owner = el.closest ? el.closest('[data-screen]') : null;
      slug = owner ? owner.getAttribute('data-screen') : (SCREEN_FALLBACK || '');
    }
    var section = slug ? document.querySelector('[data-screen="' + cssEscape(slug) + '"]') : null;
    var appRect = app.getBoundingClientRect();
    cmt.seq += 1;
    // n = số hiệu BỀN (không đánh lại khi xoá comment khác — badge không nhảy số)
    var maxN = 0;
    cmt.list.forEach(function (x) { if (x.screen === slug && x.n > maxN) maxN = x.n; });
    var c = {
      uid: newUid(),          // khoá duy nhất toàn cục — cần cho đồng bộ nhiều máy
      id: cmt.seq,
      n: maxN + 1,
      screen: slug,
      text: '',
      author: lastAuthor(),
      owner: ME,                 // đánh dấu chủ sở hữu để phân quyền xoá/copy
      created: stamp(),
      resolved: false,
      anchor: buildAnchor(el, section || app, cx, cy),
      // dự phòng khi mất neo: vị trí % so với khung app
      fallback: {
        fx: appRect.width ? (cx - appRect.left) / appRect.width : 0.5,
        fy: appRect.height ? (cy - appRect.top) / appRect.height : 0.25
      }
    };
    cmt.list.push(c);
    // CHỈ lưu cục bộ: comment lúc này còn RỖNG (user chưa gõ). Đẩy bản rỗng lên máy chủ
    // sẽ khiến lần kéo sau ghi đè mất chữ của chính mình/người khác → toàn "(trống)".
    // Chỉ đẩy lên sau khi đã có nội dung thật (nút Lưu).
    cmt.saveLocal();
    if (!visible) setVisible(true);
    positionAll();     // vẽ pin NGAY (không đợi rAF) để popover có chỗ bám
    schedule();
    setTimeout(function () { openPopover(c.id, true); }, 30);
  }

  function stamp() {
    var d = new Date();
    function p(x) { return (x < 10 ? '0' : '') + x; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  // ── Danh tính người review (hỏi 1 lần, nhớ máy này) ──
  var AUTHOR_KEY = 'cmt:author';
  function lastAuthor() {
    try { return localStorage.getItem(AUTHOR_KEY) || ''; } catch (e) { return ''; }
  }
  function rememberAuthor(a) {
    try { if (a) localStorage.setItem(AUTHOR_KEY, a); } catch (e) {}
  }

  // Hỏi tên khi lần đầu vào (nếu chưa có). Trả về qua callback vì có thể là hộp thoại bất đồng bộ.
  function ensureIdentity(cb) {
    var name = lastAuthor();
    if (name) { if (cb) cb(name); return; }
    openIdentityDialog(cb);
  }

  // Hộp thoại nhập tên — style lớp VỎ chrome (neutral), KHÔNG dùng token app
  function openIdentityDialog(cb, current) {
    var back = document.createElement('div');
    back.className = 'cmt-idback';
    back.innerHTML =
      '<div class="cmt-idbox">' +
      '<h3>Bạn là ai?</h3>' +
      '<p>Nhập tên để mọi người biết ai đang góp ý. Chỉ hỏi 1 lần trên máy này.</p>' +
      '<input class="cmt-idname" type="text" placeholder="Tên của bạn" maxlength="40" value="' + esc(current || '') + '">' +
      '<div class="cmt-idrow"><button class="cmt-idok">Bắt đầu góp ý</button></div>' +
      '</div>';
    document.body.appendChild(back);
    var input = back.querySelector('.cmt-idname');
    var ok = back.querySelector('.cmt-idok');
    input.focus();
    function commit() {
      var v = input.value.trim();
      if (!v) { input.focus(); input.classList.add('cmt-idempty'); return; }
      rememberAuthor(v);
      back.remove();
      renderIdentityChip();
      if (cb) cb(v);
    }
    ok.onclick = commit;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      input.classList.remove('cmt-idempty');
    });
    // Đổi tên (current truyền vào) thì cho phép đóng bằng Esc; lần đầu thì bắt buộc nhập
    if (current != null) {
      back.addEventListener('mousedown', function (e) { if (e.target === back) back.remove(); });
    }
  }

  // Chấm trạng thái đồng bộ nhỏ ngay trên nút tròn (chỉ hiện khi có backend)
  function setSyncBadge(state) {
    var el = document.getElementById('cmt-sync');
    if (!el) return;
    el.className = 'cmt-fabdot' + (Remote.on ? ' cmt-sync-' + state : '');
    el.title = state === 'ok' ? 'Đã đồng bộ — mọi người thấy chung'
      : state === 'syncing' ? 'Đang đồng bộ...'
      : 'Chưa đồng bộ được — góp ý đang lưu tạm trên máy';
  }

  // Tên hiện tại nằm trong menu, bấm để đổi
  function renderIdentityChip() {
    var chip = document.getElementById('cmt-whoami');
    if (!chip) return;
    var name = lastAuthor();
    var span = chip.querySelector('.cmt-whoname');
    if (span) span.textContent = name || 'Đặt tên của bạn';
    chip.title = 'Đang góp ý với tên "' + (name || 'chưa đặt') + '" — bấm để đổi';
  }

  // ════════════════════════════════════════════════════════════════
  // HỘP THOẠI CÀI ĐẶT — nhập jsonbin (không cần sửa file) + hướng dẫn + reset
  // ════════════════════════════════════════════════════════════════
  var SCHEMA_JSON = '{"list":[]}';   // nội dung dán vào jsonbin khi tạo bin

  function openSettings() {
    var cfg = loadCfg();
    var connected = Remote.on;
    var back = document.createElement('div');
    back.className = 'cmt-idback';
    back.innerHTML =
      '<div class="cmt-idbox cmt-setbox">' +
      '<h3>Cài đặt lưu chung</h3>' +
      '<div class="cmt-setstat ' + (connected ? 'on' : 'off') + '">' +
        (connected ? 'Đang lưu chung — mọi người thấy comment của nhau.'
                   : 'Chưa nối — comment chỉ lưu trên máy này.') + '</div>' +

      '<details class="cmt-help"' + (connected ? '' : ' open') + '><summary>Cách lấy (lần đầu, ~5 phút)</summary>' +
        '<ol class="cmt-steps">' +
        '<li>Đăng ký <b>jsonbin.io</b> (email) → mục <b>API Keys</b> → copy <b>Master Key</b>.</li>' +
        '<li>Bấm <b>Create Bin</b>, dán đúng nội dung này rồi Save:' +
          '<div class="cmt-schema"><code id="cmt-schema-txt">' + esc(SCHEMA_JSON) + '</code>' +
          '<button type="button" id="cmt-schema-copy">Copy</button></div></li>' +
        '<li>Trên URL sau khi tạo, copy đoạn cuối = <b>Bin ID</b>.</li>' +
        '<li>Dán 2 giá trị vào ô dưới → Lưu.</li>' +
        '</ol></details>' +

      '<label class="cmt-setlabel">Bin ID</label>' +
      '<input class="cmt-setinput" id="cmt-set-id" placeholder="vd 665f0a1e..." value="' + esc(cfg.binId || '') + '">' +
      '<div class="cmt-seterr" id="cmt-set-id-err"></div>' +
      '<label class="cmt-setlabel">Master Key</label>' +
      '<input class="cmt-setinput" id="cmt-set-key" placeholder="$2a$10$..." value="' + esc(cfg.binKey || '') + '">' +
      '<div class="cmt-seterr" id="cmt-set-key-err"></div>' +
      '<p class="cmt-setnote">Chỉ dùng nội bộ — chìa khoá này lộ trong trang, ai có link đều sửa/xoá được.</p>' +

      '<div class="cmt-setrow">' +
        '<button class="cmt-idok" id="cmt-set-save">Lưu &amp; kết nối</button>' +
        (connected ? '<button class="cmt-setghost" id="cmt-set-disc">Ngắt kết nối</button>' : '') +
      '</div>' +

      (connected
        ? '<div class="cmt-sharebox">' +
          '<div class="cmt-sharehead">Gửi cho người review</div>' +
          '<p class="cmt-sharenote">Copy link này gửi cho mọi người. Họ mở là thấy comment ngay và chỉ dùng bình thường — KHÔNG thấy cài đặt / Key (không phải admin).</p>' +
          '<button class="cmt-idok" id="cmt-set-sharelink">Copy link gửi review</button>' +
          '</div>'
        : '') +

      '<hr class="cmt-sethr">' +
      '<div class="cmt-setrow">' +
        '<button class="cmt-setghost cmt-setdanger" id="cmt-set-reset">Xoá hết comment (máy này)</button>' +
        '<button class="cmt-setghost" id="cmt-set-close">Đóng</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(back);
    back.addEventListener('mousedown', function (e) { if (e.target === back) back.remove(); });

    // Copy schema
    back.querySelector('#cmt-schema-copy').onclick = function () {
      var btn = this;
      copyText(SCHEMA_JSON, function (okc) { btn.textContent = okc ? 'Đã copy' : 'Copy tay'; setTimeout(function () { btn.textContent = 'Copy'; }, 1500); });
    };
    // Copy link chia sẻ (chỉ có khi đã nối)
    var shareBtn = back.querySelector('#cmt-set-sharelink');
    if (shareBtn) shareBtn.onclick = function () {
      var btn = this;
      copyText(buildShareLink(), function (okc) {
        btn.textContent = okc ? 'Đã copy link' : 'Copy tay';
        setTimeout(function () { btn.textContent = 'Copy link gửi review'; }, 1800);
      });
    };
    // Báo lỗi ngay dưới từng ô (không dùng toast dưới màn)
    var idInput = back.querySelector('#cmt-set-id');
    var keyInput = back.querySelector('#cmt-set-key');
    var idErr = back.querySelector('#cmt-set-id-err');
    var keyErr = back.querySelector('#cmt-set-key-err');
    function showErr(input, errEl, msg) {
      errEl.textContent = msg || '';
      errEl.classList.toggle('show', !!msg);
      input.classList.toggle('cmt-setinput-bad', !!msg);
    }
    // Kiểm 1 ô, trả về thông báo lỗi (rỗng = hợp lệ)
    function checkId(v) {
      if (!v) return 'Chưa nhập Bin ID.';
      if (/\s/.test(v)) return 'Bin ID không được chứa khoảng trắng — copy lại đoạn cuối URL.';
      if (v.indexOf('/') > -1 || v.indexOf('http') === 0) return 'Chỉ dán đoạn ID cuối URL, không dán cả đường link.';
      if (v.length < 8) return 'Bin ID trông quá ngắn — kiểm tra lại.';
      return '';
    }
    function checkKey(v) {
      if (!v) return 'Chưa nhập Master Key.';
      if (/\s/.test(v)) return 'Master Key không được chứa khoảng trắng.';
      if (v.indexOf('$2') !== 0) return 'Master Key jsonbin thường bắt đầu bằng "$2..." — có thể anh dán nhầm Access Key hoặc Bin ID.';
      if (v.length < 20) return 'Master Key trông quá ngắn — kiểm tra lại.';
      return '';
    }
    // Đã touched thì gõ tiếp là kiểm lại ngay (lỗi tắt khi sửa đúng)
    idInput.addEventListener('input', function () { if (idInput.dataset.touched) showErr(idInput, idErr, checkId(idInput.value.trim())); });
    keyInput.addEventListener('input', function () { if (keyInput.dataset.touched) showErr(keyInput, keyErr, checkKey(keyInput.value.trim())); });
    idInput.addEventListener('blur', function () { idInput.dataset.touched = '1'; showErr(idInput, idErr, checkId(idInput.value.trim())); });
    keyInput.addEventListener('blur', function () { keyInput.dataset.touched = '1'; showErr(keyInput, keyErr, checkKey(keyInput.value.trim())); });

    back.querySelector('#cmt-set-save').onclick = function () {
      var id = idInput.value.trim();
      var key = keyInput.value.trim();
      var eId = checkId(id), eKey = checkKey(key);
      idInput.dataset.touched = '1'; keyInput.dataset.touched = '1';
      showErr(idInput, idErr, eId);
      showErr(keyInput, keyErr, eKey);
      if (eId) { idInput.focus(); return; }
      if (eKey) { keyInput.focus(); return; }
      // KIỂM THẬT với máy chủ TRƯỚC khi lưu — tránh lưu nhầm key sai rồi tưởng đã xong.
      var saveBtn = this;
      saveBtn.disabled = true; saveBtn.textContent = 'Đang kiểm tra...';
      var probe = {
        on: true, base: 'https://api.jsonbin.io/v3/b/' + id,
        headers: function () { return { 'Content-Type': 'application/json', 'X-Master-Key': key, 'X-Bin-Meta': 'false' }; }
      };
      fetch(probe.base + '/latest', { headers: probe.headers() })
        .then(function (res) { return { ok: res.ok, status: res.status }; })
        .catch(function () { return { ok: false, status: -1 }; })
        .then(function (r) {
          saveBtn.disabled = false; saveBtn.textContent = 'Lưu & kết nối';
          if (!r.ok) {
            if (r.status === 401 || r.status === 403) {
              showErr(keyInput, keyErr, 'Mã truy cập không đúng (máy chủ từ chối). Kiểm tra lại Master Key.');
              keyInput.focus();
            } else if (r.status === 404) {
              showErr(idInput, idErr, 'Không tìm thấy kho này — Bin ID không đúng.');
              idInput.focus();
            } else if (r.status === -1) {
              toast('Không nối được mạng để kiểm tra — kiểm tra kết nối rồi thử lại');
            } else {
              showErr(keyInput, keyErr, 'Máy chủ từ chối (mã ' + r.status + '). Kiểm tra lại Bin ID và Mã truy cập.');
            }
            return;   // KHÔNG lưu khi chưa dùng được
          }
          // Đổi sang bin KHÁC → hỏi rồi DỌN comment của bin cũ, tránh chúng bị đẩy lên bin mới.
          var prev = loadCfg();
          if (prev.binId && prev.binId !== id) {
            if (!confirm('Đổi sang kho comment khác.\n\nComment của kho CŨ trên máy này sẽ được dọn đi ' +
                         '(chúng vẫn còn trên kho cũ), để không bị trộn nhầm vào kho mới.\n\nTiếp tục?')) return;
            clearLocalComments();
          }
          saveCfg({ binId: id, binKey: key });
          toast('Kết nối thành công — đang tải lại...');
          setTimeout(doReload, 500);
        });
    };
    var disc = back.querySelector('#cmt-set-disc');
    if (disc) disc.onclick = function () {
      if (!confirm('Ngắt kết nối lưu chung? Comment sẽ chỉ còn trên máy này.')) return;
      saveCfg({});
      setTimeout(doReload, 200);
    };
    back.querySelector('#cmt-set-reset').onclick = function () {
      back.remove();
      if (window.CommentLayer && window.CommentLayer.clear) window.CommentLayer.clear();
    };
    back.querySelector('#cmt-set-close').onclick = function () { back.remove(); };
  }

  // (saveCfg định nghĩa ở đầu module, gần loadCfg)

  // Báo kết quả LƯU cho user (đúng sự thật, không báo bừa "đã lưu"):
  //  · Không nối máy chủ  → lưu máy xong là xong.
  //  · Có nối             → chờ ghi lên máy chủ thật sự thành công mới báo "Đã lưu".
  function onSaveResult(okLocal, done) {
    if (!okLocal) { toast('CHƯA lưu được — hãy Copy góp ý ra ngoài trước khi đóng tab'); if (done) done(); return; }
    if (!Remote.on) { toast('Đã lưu trên máy này'); if (done) done(); return; }
    var finished = false;
    Remote.onWritten(function (ok) {
      if (finished) return; finished = true;
      toast(ok ? 'Đã lưu — mọi người sẽ thấy góp ý này' : 'Đã lưu trên máy, nhưng CHƯA đẩy lên được (sẽ thử lại)');
      if (done) done();
    });
    // Phòng khi mạng treo lâu: vẫn trả lại giao diện, nói rõ đang chờ
    setTimeout(function () {
      if (finished) return; finished = true;
      toast('Đã lưu trên máy — đang đẩy lên máy chủ...');
      if (done) done();
    }, 6000);
  }

  // Quyền: admin làm gì cũng được; người thường chỉ đụng comment của CHÍNH MÌNH.
  // Comment cũ (chưa có owner) coi như của mình để không khoá oan dữ liệu đã có.
  function isMine(c) { return !c.owner || c.owner === ME; }
  function canManage(c) { return isAdmin || isMine(c); }

  // Dựng link chia sẻ: ...#cmt=<binId>~<key>. Mở link này ở máy mới → tự nối (importShareLink).
  function buildShareLink() {
    var base = location.origin + location.pathname + location.search;
    return base + '#cmt=' + encodeURIComponent(BIN_ID + '~' + BIN_KEY);
  }

  // Reload để áp cấu hình mới. Gián tiếp qua đây để test tự động thay được (không reload thật).
  function doReload() {
    if (window.CommentLayer && typeof window.CommentLayer._reload === 'function') { window.CommentLayer._reload(); return; }
    location.reload();
  }

  // ════════════════════════════════════════════════════════════════
  // POPOVER
  // ════════════════════════════════════════════════════════════════
  function byId(id) {
    for (var i = 0; i < cmt.list.length; i++) if (cmt.list[i].id === id) return cmt.list[i];
    return null;
  }

  function openPopover(id, editing) {
    var c = byId(id);
    if (!c) return;
    openId = id;
    var isEdit = editing || !c.text;
    var slug = c.screen;
    var section = document.querySelector('[data-screen="' + cssEscape(slug) + '"]');
    var el = resolveAnchor(c.anchor, section);
    var targetLabel = describeTarget(c.anchor, el);

    pop.innerHTML =
      '<header><b>#' + c.n + ' · ' + esc(c.screen || '—') + '</b>' +
      '<span class="meta">' + esc(c.author || 'ẩn danh') + ' · ' + esc(c.created) + '</span></header>' +
      '<div class="body">' +
      (isEdit
        ? '<textarea id="cmt-text" placeholder="Góp ý của bạn về phần tử này...">' + esc(c.text) + '</textarea>'
        : '<div class="saved-text">' + esc(c.text) + '</div>') +
      '<div class="target' + (el ? '' : ' lost') + '">' + (el ? 'Neo: ' : 'MẤT NEO (phần tử không còn) — ') + esc(targetLabel) + '</div>' +
      '</div>' +
      '<footer>' +
      (isEdit
        ? '<button class="primary" id="cmt-save">Lưu</button><button id="cmt-cancel">Huỷ</button>'
        // Sửa: chỉ chủ comment (hoặc admin). "Đã xử lý" thì ai cũng đánh dấu được (việc chung).
        : (canManage(c) ? '<button id="cmt-edit">Sửa</button>' : '') +
          '<button id="cmt-resolve">' + (c.resolved ? 'Mở lại' : 'Đã xử lý') + '</button>') +
      // Xoá: chỉ chủ comment, hoặc admin (admin xoá được của bất kỳ ai)
      (canManage(c) ? '<button class="danger" id="cmt-del">Xoá</button>' : '') +
      (!canManage(c) ? '<span class="cmt-ofother">Comment của ' + esc(c.author || 'người khác') + '</span>' : '') +
      '</footer>';
    pop.classList.add('open');
    placePopover(id);

    if (isEdit) {
      var ta = pop.querySelector('#cmt-text');
      ta.focus();
      pop.querySelector('#cmt-save').onclick = function () {
        var btn = this;
        c.text = ta.value.trim();
        // Tác giả lấy từ danh tính đã nhập (chip trên thanh công cụ), KHÔNG hỏi lại trong popover.
        if (!c.author) c.author = lastAuthor();
        if (!c.text) { removeComment(c.id); return; }   // lưu rỗng = bỏ pin
        // Báo trạng thái lưu THẬT: đang lưu → đã lưu (hoặc lỗi), để user biết chắc chắn.
        btn.disabled = true;
        btn.textContent = Remote.on ? 'Đang lưu...' : 'Đang lưu...';
        var okLocal = cmt.save();          // lưu máy + xếp hàng đẩy lên (nếu có backend)
        renderList();
        schedule();
        onSaveResult(okLocal, function () {
          openPopover(c.id, false);        // đóng về chế độ xem sau khi báo xong
        });
      };
      pop.querySelector('#cmt-cancel').onclick = function () {
        if (!c.text) removeComment(c.id);               // huỷ khi chưa từng có nội dung → gỡ pin
        else openPopover(c.id, false);
      };
    } else {
      var editBtn = pop.querySelector('#cmt-edit');       // không có nếu không phải comment của mình
      if (editBtn) editBtn.onclick = function () { openPopover(c.id, true); };
      pop.querySelector('#cmt-resolve').onclick = function () {
        c.resolved = !c.resolved; cmt.save(); renderList(); schedule(); openPopover(c.id, false);
      };
    }
    var delBtn = pop.querySelector('#cmt-del');            // không có nếu không đủ quyền
    if (delBtn) delBtn.onclick = function () {
      if (confirm('Xoá comment #' + c.n + '?')) removeComment(c.id);
    };
  }

  function describeTarget(a, el) {
    if (a.cmtId) return '[data-cmt="' + a.cmtId + '"]';
    if (a.elId) return '#' + a.elId;
    if (el) {
      var t = el.tagName.toLowerCase();
      var cls = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      var txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      return t + (cls ? '.' + cls : '') + (txt ? ' "' + txt + '"' : '');
    }
    return a.path || (a.sig ? a.sig.tag + ' "' + (a.sig.text || '') + '"' : '?');
  }

  function placePopover(id) {
    var pin = layer.querySelector('.cmt-pin[data-cid="' + cssEscape(String(id)) + '"]');
    // Pin biến mất (đổi màn không qua hash) hoặc cuộn khuất → ĐÓNG popover.
    // Return sớm sẽ để lại 1 hộp mồ côi treo giữa màn, không gắn với phần tử nào.
    // NGOẠI LỆ: đang gõ dở trong ô nhập thì giữ nguyên, không cướp chữ của người dùng.
    if (!pin || pin.style.display === 'none') {
      var typing = pop.querySelector('#cmt-text');
      if (typing && typing.value.trim()) return;   // giữ bản nháp
      closePopover();
      return;
    }
    var pr = pin.getBoundingClientRect();
    var pw = pop.offsetWidth || 300, ph = pop.offsetHeight || 200;
    var left = pr.right + 10;
    if (left + pw > window.innerWidth - 8) left = Math.max(8, pr.left - pw - 10);
    var top = pr.top;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';
  }

  function closePopover() { pop.classList.remove('open'); openId = null; }

  function removeComment(id) {
    var gone = byId(id);
    if (gone && !canManage(gone)) { toast('Chỉ xoá được comment của mình'); return; }
    cmt.list = cmt.list.filter(function (c) { return c.id !== id; });
    cmt.save();
    if (gone && Remote.on) { addTombstone(gone.uid); Remote.del(gone.uid); }   // chặn kéo-lại + xoá máy chủ nếu policy cho phép
    closePopover();
    renderList();
    schedule();
  }

  // ════════════════════════════════════════════════════════════════
  // DANH SÁCH + COPY ALL
  // ════════════════════════════════════════════════════════════════
  function renderList() {
    var items = document.getElementById('cmt-items');
    var n = cmt.list.length;
    var badge = document.getElementById('cmt-count');
    if (badge) { badge.textContent = String(n); badge.className = 'cmt-fabcount' + (n ? '' : ' zero'); }
    var mc = document.getElementById('cmt-mcount');
    if (mc) mc.textContent = String(n);
    var qc = document.getElementById('cmt-qcount');
    if (qc) qc.textContent = String(n);
    if (!n) {
      items.innerHTML = '<div class="cmt-empty">Chưa có góp ý nào.<br>Bấm <b>Thêm góp ý</b> rồi click vào phần tử muốn nhận xét.</div>';
      return;
    }
    var byScreen = {};
    cmt.list.forEach(function (c) { (byScreen[c.screen] = byScreen[c.screen] || []).push(c); });
    var html = '';
    Object.keys(byScreen).forEach(function (s) {
      html += '<div class="cmt-item" style="cursor:default;background:#fafafa;font-weight:700;font-size:11px;color:#555">' + esc(s) + '</div>';
      byScreen[s].forEach(function (c) {
        html += '<div class="cmt-item' + (c.resolved ? ' resolved' : '') + '" data-cid="' + esc(c.id) + '">' +
          '<div class="h"><span class="n">' + esc(c.n) + '</span>' + esc(c.author || 'ẩn danh') + ' · ' + esc(c.created) + '</div>' +
          '<div class="t">' + esc(c.text || '(trống)') + '</div></div>';
      });
    });
    items.innerHTML = html;
    items.querySelectorAll('.cmt-item[data-cid]').forEach(function (n) {
      n.addEventListener('click', function () {
        var c = byId(parseInt(n.dataset.cid, 10));
        if (!c) return;
        if (c.screen && c.screen !== currentScreenSlug()) {
          // Gọi THẲNG showScreen nếu vật chủ có (app không chắc lắng nghe hashchange),
          // đồng thời set hash để URL vẫn khớp màn đang xem.
          if (typeof window.showScreen === 'function') {
            try { window.showScreen(c.screen); } catch (err) {}
          }
          location.hash = c.screen;
        }
        if (!visible) setVisible(true);
        setTimeout(function () { openPopover(c.id, false); }, 60);
      });
    });
  }

  // Nhãn NGẮN GỌN cho phần tử được neo — ưu tiên chữ người dùng thấy (dễ hiểu cho cả
  // người đọc lẫn AI), thay vì selector kỹ thuật. Vd "Đăng nhập", "Email".
  function shortTargetLabel(c, el) {
    if (el) {
      // nhãn kề (label/placeholder) hoặc chính chữ trên phần tử
      var t = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('placeholder'))) || '';
      if (!t && el.tagName && /^(input|select|textarea)$/i.test(el.tagName)) {
        var lb = el.closest && el.closest('label');
        if (lb) t = (lb.textContent || '').trim();
        if (!t && el.id) {
          var forLb = document.querySelector('label[for="' + cssEscape(el.id) + '"]');
          if (forLb) t = (forLb.textContent || '').trim();
        }
      }
      if (!t) t = (el.textContent || '').trim();
      t = t.replace(/\s+/g, ' ').slice(0, 40);
      if (t) return t;
    }
    if (c.anchor.sig && c.anchor.sig.text) return c.anchor.sig.text.slice(0, 40);
    if (c.anchor.cmtId) return c.anchor.cmtId;
    return 'phần tử';
  }

  // opts: {style:'compact'|'detail', who:'' | tên người, scope:'all'|'mine', groupBy:'author'|'screen'}
  function buildMarkdown(opts) {
    opts = opts || {};
    var style = opts.style || 'compact';
    var groupBy = opts.groupBy || 'author';
    var list = cmt.list.slice();
    // Lọc phạm vi: người thường chỉ được copy comment của mình
    if (opts.scope === 'mine' || !isAdmin) list = list.filter(isMine);
    if (opts.who) list = list.filter(function (c) { return (c.author || 'ẩn danh') === opts.who; });

    var lines = [];
    lines.push('# Góp ý prototype — ' + FEATURE);
    lines.push('_' + stamp() + ' · ' + list.length + ' góp ý' +
      (opts.who ? ' · lọc theo: ' + opts.who : '') +
      ((!isAdmin || opts.scope === 'mine') ? ' · chỉ của tôi' : '') + '_');
    lines.push('');

    if (!list.length) { lines.push('_(không có góp ý nào)_'); return lines.join('\n'); }

    function lineOf(c) {
      var section = c.screen ? document.querySelector('[data-screen="' + cssEscape(c.screen) + '"]') : null;
      var el = resolveAnchor(c.anchor, section);
      var where = shortTargetLabel(c, el);
      var body = String(c.text || '(trống)').replace(/\r/g, '').replace(/\n+/g, ' ').trim();
      var s = '- **[' + where + ']** ' + body;
      if (c.resolved) s += ' _(đã xử lý)_';
      if (!el) s += ' _(phần tử không còn)_';
      if (style === 'detail') {
        s += '  \n  `' + (c.anchor.cmtId || c.anchor.elId || c.anchor.path || '?').replace(/`/g, "'") + '`' +
             ' · ' + (c.created || '—');
      }
      return s;
    }

    var groups = {};
    list.forEach(function (c) {
      var k = groupBy === 'screen' ? (c.screen || '(không rõ)') : (c.author || 'ẩn danh');
      (groups[k] = groups[k] || []).push(c);
    });
    Object.keys(groups).forEach(function (k) {
      var items = groups[k];
      lines.push('## ' + k + ' (' + items.length + ')');
      // Trong mỗi nhóm người, gom tiếp theo màn để người đọc/AI biết đang nói về màn nào
      if (groupBy === 'author') {
        var byScreen = {};
        items.forEach(function (c) { (byScreen[c.screen || '(không rõ)'] = byScreen[c.screen || '(không rõ)'] || []).push(c); });
        Object.keys(byScreen).forEach(function (s) {
          lines.push('**Màn ' + s + ':**');
          byScreen[s].forEach(function (c) { lines.push(lineOf(c)); });
        });
      } else {
        items.forEach(function (c) { lines.push(lineOf(c) + ' — ' + (c.author || 'ẩn danh')); });
      }
      lines.push('');
    });
    return lines.join('\n');
  }

  // Copy 1 chuỗi bất kỳ, gọi cb(ok) khi xong. Dùng chung cho Copy all + copy schema.
  function copyText(text, cb) {
    var okFn = function () { if (cb) cb(true); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(okFn, function () { legacyCopy(text, okFn, cb); });
    } else {
      legacyCopy(text, okFn, cb);
    }
  }

  // Copy nhanh (nút trên thanh công cụ). Người thường → chỉ comment của mình.
  // Admin → mở bảng tuỳ chọn (chọn người + kiểu format).
  function copyAll() {
    if (isAdmin) { openCopyPanel(); return; }
    var mine = cmt.list.filter(isMine);
    if (!mine.length) { toast('Bạn chưa có góp ý nào để copy'); return; }
    var md = buildMarkdown({ scope: 'mine' });
    copyText(md, function (ok) { if (ok) toast('Đã copy ' + mine.length + ' góp ý của bạn'); });
  }

  // Bảng tuỳ chọn copy — CHỈ admin: chọn người + kiểu format rồi copy hàng loạt.
  function openCopyPanel() {
    if (!cmt.list.length) { toast('Chưa có comment nào để copy'); return; }
    var people = {};
    cmt.list.forEach(function (c) { var a = c.author || 'ẩn danh'; people[a] = (people[a] || 0) + 1; });
    var names = Object.keys(people);

    var back = document.createElement('div');
    back.className = 'cmt-idback';
    back.innerHTML =
      '<div class="cmt-idbox cmt-setbox">' +
      '<h3>Copy góp ý</h3>' +
      '<label class="cmt-setlabel">Của ai</label>' +
      '<select class="cmt-setinput" id="cmt-cp-who">' +
        '<option value="">Tất cả (' + cmt.list.length + ')</option>' +
        names.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + ' (' + people[n] + ')</option>'; }).join('') +
      '</select>' +
      '<label class="cmt-setlabel">Kiểu</label>' +
      '<select class="cmt-setinput" id="cmt-cp-style">' +
        '<option value="compact">Gọn — 1 dòng mỗi góp ý (dễ dán chat/AI)</option>' +
        '<option value="detail">Đầy đủ — kèm mã phần tử + thời gian (cho dev)</option>' +
      '</select>' +
      '<label class="cmt-setlabel">Nhóm theo</label>' +
      '<select class="cmt-setinput" id="cmt-cp-group">' +
        '<option value="author">Người góp ý</option>' +
        '<option value="screen">Màn hình</option>' +
      '</select>' +
      '<div class="cmt-cppreview" id="cmt-cp-preview"></div>' +
      '<div class="cmt-setrow">' +
        '<button class="cmt-idok" id="cmt-cp-copy">Copy</button>' +
        '<button class="cmt-setghost" id="cmt-cp-close">Đóng</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(back);
    back.addEventListener('mousedown', function (e) { if (e.target === back) back.remove(); });

    function opts() {
      return {
        who: back.querySelector('#cmt-cp-who').value,
        style: back.querySelector('#cmt-cp-style').value,
        groupBy: back.querySelector('#cmt-cp-group').value
      };
    }
    function refresh() {
      var md = buildMarkdown(opts());
      back.querySelector('#cmt-cp-preview').textContent = md;
    }
    back.querySelectorAll('select').forEach(function (s) { s.addEventListener('change', refresh); });
    refresh();

    back.querySelector('#cmt-cp-copy').onclick = function () {
      var btn = this;
      copyText(buildMarkdown(opts()), function (ok) {
        btn.textContent = ok ? 'Đã copy' : 'Copy tay';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
      });
    };
    back.querySelector('#cmt-cp-close').onclick = function () { back.remove(); };
  }

  function legacyCopy(text, done, cbFail) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (ok) done();
    else { if (cbFail) cbFail(false); showCopyFallback(text); }
  }

  // Không copy được (trình duyệt chặn hoàn toàn) → hiện textarea cho user tự Ctrl+C
  function showCopyFallback(text) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px';
    d.innerHTML = '<div style="background:#fff;border-radius:10px;padding:14px;max-width:640px;width:100%;font:13px -apple-system,sans-serif">' +
      '<div style="margin-bottom:8px;font-weight:700">Copy thủ công (trình duyệt chặn clipboard trên file://)</div>' +
      '<textarea style="width:100%;height:320px;font:12px monospace;padding:8px;border:1px solid #ccc;border-radius:6px"></textarea>' +
      '<div style="margin-top:8px;text-align:right"><button style="padding:7px 14px;border-radius:6px;border:1px solid #000;background:#000;color:#fff;cursor:pointer;font:600 12px inherit">Đóng</button></div></div>';
    var ta = d.querySelector('textarea');
    ta.value = text;
    d.querySelector('button').onclick = function () { d.remove(); };
    document.body.appendChild(d);
    ta.select();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ════════════════════════════════════════════════════════════════
  // TOGGLE + BINDINGS
  // ════════════════════════════════════════════════════════════════
  function setVisible(on) {
    visible = on;
    layer.classList.toggle('hidden', !on);
    var lb = document.getElementById('cmt-toggle-label');
    if (lb) lb.textContent = on ? 'Ẩn ghim' : 'Hiện ghim';
    document.getElementById('cmt-toggle').classList.toggle('on', !on);
    if (!on) { closePopover(); setPicking(false); listBox.classList.remove('open'); }
    if (on) schedule();
  }

  document.getElementById('cmt-toggle').onclick = function () { setVisible(!visible); toggleCmtMenu(false); };

  // Hành động "thêm góp ý" dùng chung cho cả nút nhanh (thanh mở rộng) lẫn mục trong menu
  function startAddComment() {
    toggleCmtMenu(false);                       // đóng menu để không che phần tử cần chọn
    if (!visible) setVisible(true);
    // Chưa có tên → hỏi trước, xong mới vào chế độ ghim
    if (!lastAuthor()) { ensureIdentity(function () { setPicking(true); }); return; }
    setPicking(!picking);
  }
  document.getElementById('cmt-add').onclick = startAddComment;
  document.getElementById('cmt-add-quick').onclick = function (e) { e.stopPropagation(); startAddComment(); };

  function toggleListBox() {
    toggleCmtMenu(false);
    listBox.classList.toggle('open');
    if (listBox.classList.contains('open')) renderList();
  }
  document.getElementById('cmt-list-quick').onclick = function (e) { e.stopPropagation(); toggleListBox(); };
  document.getElementById('cmt-whoami').onclick = function () {
    toggleCmtMenu(false);
    openIdentityDialog(function () { renderIdentityChip(); }, lastAuthor());
  };
  var settingsBtn = document.getElementById('cmt-settings');   // chỉ có khi admin
  if (settingsBtn) settingsBtn.onclick = function () { toggleCmtMenu(false); openSettings(); };
  document.getElementById('cmt-copy').onclick = function () { toggleCmtMenu(false); copyAll(); };
  document.getElementById('cmt-listbtn').onclick = toggleListBox;
  listBox.querySelector('.close').onclick = function () { listBox.classList.remove('open'); };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (picking) { setPicking(false); return; }
      if (pop.classList.contains('open')) { closePopover(); return; }
      if (listBox.classList.contains('open')) listBox.classList.remove('open');
    }
  });

  // click ra ngoài popover → đóng (nhưng không đóng khi click pin/toolbar/list)
  document.addEventListener('mousedown', function (e) {
    if (!pop.classList.contains('open')) return;
    if (pop.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.cmt-pin, .cmt-bar, .cmt-list')) return;
    closePopover();
  });

  // chuyển màn → vẽ lại pin của màn mới
  window.addEventListener('hashchange', function () { closePopover(); schedule(); });

  // ── Nhiều tab cùng mở 1 file: TRỘN thay vì ghi đè (chống mất comment của tab kia) ──
  // Không có bước này, tab lưu sau sẽ ghi đè toàn bộ danh sách của tab lưu trước.
  window.addEventListener('storage', function (e) {
    if (e.key !== CMT_KEY || !e.newValue) return;
    var incoming;
    try { incoming = JSON.parse(e.newValue); } catch (err) { return; }
    if (!incoming || !Array.isArray(incoming.list)) return;
    var byId = {};
    cmt.list.forEach(function (c) { byId[c.id] = c; });
    var added = 0;
    incoming.list.forEach(function (raw) {
      if (!raw || typeof raw !== 'object') return;
      var c = normalize(raw);
      if (!byId[c.id]) { cmt.list.push(c); byId[c.id] = c; added++; }
    });
    if (incoming.seq > cmt.seq) cmt.seq = incoming.seq;
    if (added) {
      renderList();
      schedule();
      toast('Đã nhận ' + added + ' comment mới từ tab khác');
    }
  });

  // API cho vật chủ (nếu prototype muốn gọi chủ động sau render)
  window.CommentLayer = {
    feature: FEATURE,
    storageKey: CMT_KEY,
    refresh: schedule,
    repositionNow: positionAll,     // đồng bộ, bỏ qua rAF — dùng cho test tự động
    syncEnabled: Remote.on,
    pullNow: function (done) { Remote.pull(done); },   // kéo comment mới của người khác về ngay
    exportMarkdown: buildMarkdown,
    all: function () { return cmt.list.slice(); },
    clear: function () {
      if (!confirm('Xoá TẤT CẢ comment? Không thể hoàn tác.')) return;
      cmt.list = []; cmt.seq = 0; cmt.save(); closePopover(); renderList(); schedule();
    }
  };

  renderList();
  renderIdentityChip();
  setBarMode(getBarMode());   // desktop mở rộng sẵn / mobile thu gọn / theo lựa chọn đã nhớ
  schedule();

  // ════════════════════════════════════════════════════════════════
  // CHẶN KHI KHÔNG LƯU ĐƯỢC — thông điệp khác nhau theo vai:
  //   · Admin   → tự sửa được: mở thẳng Cài đặt, bắt điền cho đủ.
  //   · Reviewer→ không sửa được: báo link thiếu "Mã truy cập", bảo liên hệ admin.
  // Mục đích: KHÔNG để ai gõ góp ý rồi mới biết không lưu được.
  // ════════════════════════════════════════════════════════════════
  var blockEl = null;
  function setCommentingBlocked(on, reason) {
    [document.getElementById('cmt-add'), document.getElementById('cmt-add-quick')].forEach(function (b) {
      if (!b) return;
      b.disabled = !!on;
      b.title = on ? (reason || 'Chưa lưu được — tạm khoá góp ý') : 'Ghim góp ý mới';
      var lbl = b.querySelector('span');
      if (lbl) lbl.textContent = on ? 'Chưa góp ý được' : 'Thêm góp ý';
    });
    if (on) { setPicking(false); setSyncBadge('err'); }
  }

  function showBlockDialog(kind, detail) {
    if (blockEl) { try { blockEl.remove(); } catch (e) {} blockEl = null; }
    var isAdminFix = (kind === 'admin');
    var back = document.createElement('div');
    back.className = 'cmt-idback';
    back.innerHTML =
      '<div class="cmt-idbox">' +
      '<h3>' + (isAdminFix ? 'Chưa kết nối được kho góp ý' : 'Link chưa dùng được') + '</h3>' +
      (isAdminFix
        ? '<p>' + esc(detail || 'Bin ID hoặc Mã truy cập (Master Key) chưa đúng nên không lưu được góp ý.') + '</p>' +
          '<p class="cmt-setnote">Hãy điền đầy đủ và đúng thông tin kho để mọi người góp ý được.</p>' +
          '<div class="cmt-idrow"><button class="cmt-idok" id="cmt-blk-fix">Mở Cài đặt để điền</button></div>'
        : '<p>Link bạn nhận được <b>thiếu hoặc sai Mã truy cập</b> nên không lưu được góp ý.</p>' +
          '<p class="cmt-setnote">Vui lòng liên hệ người gửi (admin) để xin lại link đầy đủ.' +
          (detail ? '<br><span style="opacity:.7">Chi tiết: ' + esc(detail) + '</span>' : '') + '</p>' +
          '<div class="cmt-idrow"><button class="cmt-idok" id="cmt-blk-ok">Đã hiểu</button></div>') +
      '</div>';
    document.body.appendChild(back);
    blockEl = back;
    if (isAdminFix) {
      back.querySelector('#cmt-blk-fix').onclick = function () { back.remove(); blockEl = null; openSettings(); };
    } else {
      // Reviewer KHÔNG tự sửa được → chỉ cho đóng thông báo, nhưng vẫn khoá góp ý
      back.querySelector('#cmt-blk-ok').onclick = function () { back.remove(); blockEl = null; };
    }
  }

  // 1) Link hỏng ngay từ URL (thiếu/đứt Mã truy cập) → chặn luôn, không cần gọi mạng
  if (shareLinkError) {
    setCommentingBlocked(true, 'Link thiếu Mã truy cập');
    showBlockDialog(isAdmin ? 'admin' : 'user', shareLinkError);
  } else if (!Remote.on) {
    // 2) Chưa cấu hình kho: admin phải điền; reviewer thì link thiếu thông tin
    //    (KHÔNG chặn nếu chủ ý dùng offline — nhận biết bằng biến CMT_LOCAL_ONLY)
    if (!window.CMT_LOCAL_ONLY) {
      setCommentingBlocked(true, 'Chưa kết nối kho góp ý');
      showBlockDialog(isAdmin ? 'admin' : 'user',
        isAdmin ? 'Chưa nhập Bin ID và Mã truy cập.' : 'Link không kèm thông tin kho góp ý.');
    }
  } else {
    // 3) Có cấu hình → KIỂM THẬT với máy chủ (key sai/hết hạn/bin không tồn tại vẫn bắt được)
    Remote.verify(function (ok, status) {
      if (ok) return;                       // dùng được → không chặn
      if (status === -1) {                  // lỗi mạng: không kết tội cấu hình, chỉ cảnh báo
        toast('Không nối được máy chủ — góp ý sẽ lưu tạm trên máy và đẩy lại sau');
        return;
      }
      var why = (status === 401 || status === 403) ? 'Mã truy cập (Master Key) không đúng.'
              : (status === 404) ? 'Không tìm thấy kho (Bin ID không đúng).'
              : 'Máy chủ từ chối (mã ' + status + ').';
      setCommentingBlocked(true, why);
      showBlockDialog(isAdmin ? 'admin' : 'user', why);
    });
  }

  // ── Đồng bộ backend (nếu đã cấu hình) — TIẾT KIỆM REQUEST ──
  // Free tier tính theo số request, nên KHÔNG hỏi máy chủ khi không cần:
  //   · Tab ẩn (chuyển tab/thu nhỏ) → NGỪNG hẳn, không tốn request nào.
  //   · Người dùng ngồi im > 2 phút → coi như rảnh, ngừng cho tới khi họ chạm lại.
  //   · Không có gì mới → giãn dần nhịp (15s → 30s → 60s → tối đa 5 phút).
  //   · Có thay đổi (mình hoặc người khác) → về lại nhịp nhanh.
  if (Remote.on) {
    setSyncBadge('syncing');
    Remote.pull(function () {
      setSyncBadge('ok');
      if (cmt.list.length) Remote.push();   // writeAll đã read-merge-write nên không đè của ai
    });

    var MIN_MS = SYNC_INTERVAL_MS;      // 15s khi đang có hoạt động
    var MAX_MS = 5 * 60 * 1000;         // 5 phút khi im ắng
    var IDLE_MS = 2 * 60 * 1000;        // ngồi im quá lâu → ngừng poll
    var curMs = MIN_MS;
    var lastActive = +new Date();
    var timer = null;

    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(function (ev) {
      window.addEventListener(ev, function () {
        var wasIdle = (+new Date() - lastActive) > IDLE_MS;
        lastActive = +new Date();
        if (wasIdle) { curMs = MIN_MS; arm(); Remote.pull(); }   // vừa quay lại → cập nhật ngay
      }, { passive: true });
    });

    // Khi có comment mới về (hoặc mình vừa sửa) → tăng tốc lại
    onRemoteChange = function () { curMs = MIN_MS; arm(); };

    function shouldPoll() {
      if (document.hidden) return false;                         // tab ẩn → im hẳn
      if (+new Date() - lastActive > IDLE_MS) return false;       // rảnh → im
      return true;
    }
    function tick() {
      if (!shouldPoll()) { arm(); return; }                      // bỏ lượt, không tốn request
      var before = cmt.list.length;
      Remote.pull(function () {
        // không có gì mới → giãn nhịp ra để đỡ tốn
        if (cmt.list.length === before) curMs = Math.min(curMs * 2, MAX_MS);
        else curMs = MIN_MS;
        arm();
      });
    }
    function arm() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, curMs);
    }
    arm();

    // Quay lại tab → cập nhật ngay 1 lần rồi về nhịp nhanh
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { lastActive = +new Date(); curMs = MIN_MS; Remote.pull(); arm(); }
    });
  }

  // Lần đầu vào (chưa có comment nào + chưa có tên) → chào hỏi tên ngay.
  // Nếu đã từng dùng (có comment hoặc đã có tên) thì không làm phiền.
  if (!lastAuthor() && cmt.list.length === 0) {
    setTimeout(function () { ensureIdentity(); }, 400);
  }
})();
