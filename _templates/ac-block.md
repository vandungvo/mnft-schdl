### AC-{{ac_number}} — {{title}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Scope: `docs/{{feature}}/userstories/us-{{story_number}}.md`

- **Type:** {{type}}
- **Covers:** FR-{{feature}}-{{fr_number}}
- **Screen:** {{screen_ref}}
- **Error code:** E-{{feature}}-{{error_number}}

```gherkin
Given {{given}}
When {{when}}
Then {{then}}
```

<!-- Biến thể — nhiều scenario cùng 1 business rule: gom dưới Rule: -->

### AC-{{ac_number}} — {{rule_title}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Scope: `docs/{{feature}}/userstories/us-{{story_number}}.md`‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

- **Type:** business-rule
- **Covers:** FR-{{feature}}-{{fr_number}} / BR-{{feature}}-{{br_number}}

```gherkin
Rule: {{rule_statement}}

  Scenario: {{scenario_title}}
    Given {{given}}
    When {{when}}
    Then {{then}}
```

<!-- Biến thể — cùng rule, nhiều bộ dữ liệu: Scenario Outline + Examples -->

### AC-{{ac_number}} — {{outline_title}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

> Scope: `docs/{{feature}}/userstories/us-{{story_number}}.md`

- **Type:** business-rule
- **Covers:** FR-{{feature}}-{{fr_number}} / BR-{{feature}}-{{br_number}}‍‌‌​​‌‌​​‌‌‌​‌‌‌‌​​‌​‌​‌‌‌‌‌​‌​​‌​​​‌​​​​‌​​​​‌​​​​​​​‌‌‌​‌‌​​​‌​​‌​​​​‌​​‌‌‌‌‌​​‌‌‌‌​‌‌‌​​​​​‌‌‌​​‌​‌‌‌‌​‌‌​​‌​‌‌​​​​​‌​‌‌​​‌‌​‌‍

```gherkin
Rule: {{rule_statement}}

  Scenario Outline: {{outline_title}}
    Given {{given_with_placeholder}}
    When {{when_with_placeholder}}
    Then {{then_with_placeholder}}

    Examples:
      | {{param_1}} | {{param_2}} | {{expected}} |
      | {{value_1a}} | {{value_2a}} | {{expected_a}} |
      | {{value_1b}} | {{value_2b}} | {{expected_b}} |
```


<!-- wm:2b9af6c9b691879b1ddb7a04d29a1c88 -->
<sub>Tài liệu thuộc bộ AI4BA BA-Kit — bản quyền ai4ba.com</sub>
