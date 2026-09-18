---
type: srs-flows
project: {{project}}
feature: {{feature_slug}}
status: draft
updated: {{date}}
links:
  feature: ./feature.md
---

# {{feature_name}} — Flows‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

>

## 1. Sequence Overview (System-wide)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```mermaid
sequenceDiagram
    actor User
    participant Client as Client (FE)
    participant BE as Backend
    participant Auth as Auth System
    participant DB as Database

    User->>Client: Initiate {{feature_name}}
    Client->>Client: Validate input (FE)
    Client->>BE: POST /{{feature_slug}}
    BE->>Auth: Verify token
    Auth-->>BE: OK
    BE->>DB: Read/Write
    DB-->>BE: Result
    BE-->>Client: 200 + payload
    Client-->>User: Show success
```

*Adjust participants and message sequence to your actual architecture. Add error branches as `alt`/`opt` blocks where useful.*

## 2. Activity Diagram (Business Flow)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```mermaid
flowchart TD
    Start([Start]) --> Step1[User initiates action]
    Step1 --> Validate{Input valid?}
    Validate -->|no| Error1[Show validation error]
    Error1 --> Step1
    Validate -->|yes| Step2[Submit to backend]
    Step2 --> Process{Backend OK?}
    Process -->|no| Error2[Show backend error]
    Process -->|yes| Step3[Update UI to success]
    Step3 --> End([End])
```

*Use this when the business logic has decision points and branching. Skip if the sequence above is enough.*

## 3. Screen Flow (User Navigation)‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```mermaid
graph LR
    Entry["Entry point<br/>(e.g. menu / link)"] --> Screen1
    Screen1["Screen 1<br/>(name)"] -->|action| Screen2
    Screen2["Screen 2<br/>(name)"] -->|success| Done["Confirmation /<br/>Next feature"]
    Screen2 -->|cancel| Entry
```

### Per-screen list‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

<!-- /wireframe-ascii appends entries here -->

- [[docs/{{feature_slug}}/ascii-wireframe/{{first_screen_slug}}|{{first_screen_name}}]]‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

---

## Links

- Feature: [[docs/srs/{{feature_slug}}/feature|{{feature_name}}]]
- Screens folder: `docs/{{feature_slug}}/ascii-wireframe/`

---

## Change Log

| Date | Change | Source |
|------|--------|--------|
| {{date}} | Initial flows draft scaffolded | Conversation |‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
