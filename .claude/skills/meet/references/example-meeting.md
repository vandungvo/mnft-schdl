---
type: meeting
meeting_type: client
date: 2026-05-12
status: captured
attendees: ["@ba", "@nam", "Anh Tâm (client CEO)", "Chị Mai (client Ops)"]
feature: payment
source: paste (transcript kickoff 45min)
updated: 2026-05-12
links:
  - docs/payment/brainstorms/checkout-flow.md
---

# Payment Kickoff — Client Meeting‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Date: 2026-05-12 | Type: client | Duration: 45min

## Attendees‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* __@ba__ (BA, ours)
* __@nam__ (Tech Lead, ours)
* __Anh Tâm__ (CEO, client side) — decision authority
* __Chị Mai__ (Head of Operations, client side) — refund workflow owner

## Agenda / Context‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

Kickoff cho feature thanh toán online. Client muốn launch payment trong Q3 2026 để giảm cart abandon (hiện 35%). Discuss gateway selection, security compliance, refund workflow ownership.

## Discussion summary‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* Anh Tâm ưu tiên Momo + VNPay vì user base VN, muốn launch sớm nhất.
* Chị Mai cần refund flow đơn giản cho ops — không có finance ops chuyên trách.
* @nam đề xuất Stripe cho card flow vì PCI tokenization sẵn có (giảm audit cost).
* Timeline Q3 vs Q4: Q3 tight nhưng Anh Tâm chấp nhận risk.
* OAuth credentials Momo cho dev environment chưa có — @nam đang ping account manager.

## Decisions‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

| # | Quyết định | Người chốt | Lý do | Phương án khác | Tác động | Status | Supersedes | Nguồn (câu gốc) |
|---|------------|------------|-------|----------------|----------|--------|------------|-----------------|
| 1 | Dùng Stripe cho card flow | @nam | PCI tokenization sẵn có, giảm audit cost | Tự xử card + tự audit PCI | payment gateway integration | accepted | — | @nam: "mình dùng Stripe cho card, tokenization sẵn khỏi tự audit PCI" |
| 2 | Launch payment v1 Q3 2026 | Anh Tâm | Giảm cart abandon 35% càng sớm càng tốt | Dời Q4 cho an toàn | timeline, scope v1 | accepted | — | Anh Tâm: "Q3 nhé, tight cũng được, tôi chấp nhận" |
| 3 | Refund cho phép trong 30 ngày sau payment | Chị Mai | Đơn giản cho ops, không có finance ops riêng | Refund window dài hơn / theo case | refund workflow (BR) | proposed | — | Chị Mai: "cho refund trong 30 ngày thôi cho ops đỡ mệt" |

> Decision 3 mới `proposed`: Chị Mai owner refund nhưng scope partial-refund (v1 hay v1.1) còn chờ Anh Tâm chốt (OQ-1) → chưa `accepted`.

## RAID

| Loại | Nội dung | Mức | Owner | Ứng phó / mốc | Nguồn (câu gốc) |
|------|----------|-----|-------|---------------|-----------------|
| Risk | Q3 timeline tight, có thể trượt deadline | High | @ba | Theo dõi sát scope v1, cắt bớt nếu cần | Anh Tâm: "tight cũng được, tôi chấp nhận risk" |
| Issue | Momo dev OAuth credentials chưa có — block integration POC | High | @nam | Ping account manager, target 2026-05-15 | @nam: "OAuth creds Momo chưa có, đang ping account manager" |
| Assumption | User đã có tài khoản Momo/VNPay khi checkout | Medium | @ba | Xác minh với Anh Tâm ở buổi URD | (ngụ ý từ thảo luận gateway, chưa ai xác nhận) |
| Dependency | Stripe Vietnam có thể cần local entity setup | Medium | @nam | Check legal sớm | @nam: "Stripe VN chắc cần local entity, phải hỏi legal" |

## Action Items‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

* [ ] __@nam__ — Setup Momo sandbox + ping account manager về OAuth creds (kết quả mong đợi: POC integration chạy được). Due __2026-05-15__.
* [ ] __@ba__ — Draft URD + BRD cho payment (kết quả mong đợi: 2 doc draft sẵn để review). Due __2026-05-19__.
* [ ] __Anh Tâm__ — Confirm refund partial scope (v1 hay v1.1) (kết quả mong đợi: OQ-1 đóng). Due __2026-05-16__.
* [ ] __Chị Mai__ — Share current refund workflow doc (legacy) (kết quả mong đợi: BA có baseline AS-IS). Due __2026-05-14__.

## Open Questions

* [ ] __OQ-1__: Refund partial scope v1 hay v1.1? (nguồn: Anh Tâm confirm 2026-05-16)
* [ ] __OQ-2__: Có dùng fraud detection bên thứ 3 (Sift, Stripe Radar) không? (nguồn: @nam nêu)
* [ ] __OQ-3__: KYC light cho guest checkout > 5M VND? (nguồn: ngụ ý từ Chị Mai về CS load)

## Xác nhận

| Item | Confirm status | Confirmed by | Ngày |
|------|----------------|--------------|------|
| Decision 1 (Stripe card) | ⏳ chờ recap reply | — | — |
| Decision 2 (Q3 launch) | ⏳ chờ recap reply | — | — |
| Decision 3 (refund 30 ngày) | ❌ chưa chốt (scope v1/v1.1 còn mở — OQ-1) | — | — |

## Tác động & Bước tiếp (đề xuất — KHÔNG tự áp)

| Item | Loại | Doc bị đụng | Bước đề xuất | Confirm? |
|------|------|-------------|--------------|----------|
| Chốt gateway Stripe/Momo/VNPay | decision | payment-urd, payment-brd | `/urd payment` rồi `/brd payment` | ⏳ chờ reply |
| Refund 30 ngày | decision (BR) | payment-brd, payment-spec | `/brainstorm @<meeting> --feature payment` (làm rõ scope trước) | ❌ chưa chốt |
| Guest checkout > 5M cần KYC? | OQ | payment-urd | `/brainstorm @<meeting> --feature payment` | ❌ chưa quyết |
| Momo OAuth thiếu | RAID/Issue | — | theo dõi, chưa cần doc | n/a |

## Views nhanh

* __BA:__ Refund window (BR) + guest-KYC còn mở — cần confirm với Anh Tâm/Chị Mai trước khi đưa vào URD/spec. Baseline refund AS-IS đang chờ Chị Mai share.
* __PO:__ Scope v1 = 3 gateway + refund 30 ngày; partial-refund có thể đẩy v1.1 (chờ Anh Tâm). Ưu tiên giảm cart abandon.
* __PM:__ Q3 hard deadline (Risk: tight). Blocker Momo OAuth (target 05-15) chặn POC. Dependency: Stripe VN local entity — check legal sớm.

## Email Draft (recap)

```text
Subject: Payment Kickoff Recap — 2026-05-12

Anh Tâm, Chị Mai,

Cảm ơn anh chị đã dành thời gian kickoff feature thanh toán hôm nay. Em tóm tắt các chốt + action items để anh chị xác nhận giúp em (nếu em ghi sai chỗ nào, anh chị reply chỉnh giúp):

✓ Gateway: Stripe (card) + Momo (e-wallet) + VNPay (QR/banking).
✓ Timeline: launch v1 Q3 2026.
◔ Refund: cho phép trong 30 ngày — nhưng partial-refund v1 hay v1.1 em còn chờ anh Tâm chốt.
⚠ Blocker: OAuth credentials Momo — @nam đang ping account manager, target 2026-05-15.

Action items:
- @nam: Momo sandbox setup, deadline 2026-05-15.
- Em: draft URD + BRD trong tuần này.
- Anh Tâm: confirm refund partial scope v1 vs v1.1 trước 2026-05-16.
- Chị Mai: share refund workflow doc trước 2026-05-14.

Anh chị reply xác nhận giúp em các chốt trên nhé — em sẽ dựa vào đó để viết tài liệu.

Trân trọng,
@ba
```

## Notes

* Anh Tâm mention competitor Shopee có 1-tap checkout — muốn parity hoặc better.
* Chị Mai concerned về CS load nếu refund flow phức tạp — cần playbook + SLA support.‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền hoangphan.blog</sub>
