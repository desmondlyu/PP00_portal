# Offline switch case simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the offline Programmer menu follow C `switch`/`case` branches while bypassing IC-dependent preconditions and returning to `mh_spi_menu` after `mh_any_key()`.

**Architecture:** Keep `tool\web_terminal\index.html` as the deployed runtime, but stop hand-maintaining one linear JSON flow. Add a small authoring-time generator that reads `LP_ICIDCheck.c`, builds branch-aware output/input nodes, and writes the generated flow into the HTML. The runtime consumes nodes with explicit transitions for `select`, numeric input, confirmation, pause, return-menu, and exit; hardware statements and hardware-only conditions are ignored.

**Tech Stack:** Python standard library (`re`, brace scanning, `json`, `unittest`/`assert`), browser-native JavaScript modules, existing Playwright smoke checks.

---

## File map

- Create: `tool\web_terminal\scripts\generate_offline_flow.py`
  - Read CP950 `LP_ICIDCheck.c`.
  - Extract `printf`, input helpers, `switch`/`case`, `mh_any_key`, `goto`, and relevant control-flow blocks.
  - Ignore hardware commands and IC-dependent predicates.
  - Emit deterministic JSON flow data.
- Create: `tool\web_terminal\scripts\test_generate_offline_flow.py`
  - Run focused generator assertions without a test framework dependency.
- Modify: `tool\web_terminal\index.html:460-760`
  - Replace the current hand-patched `offlineMenu` steps with generated branch-aware data.
  - Update the offline state machine to follow node transitions and return targets.
- Modify: `docs\superpowers\specs\2026-08-20-offline-switch-case-simulation-design.md`
  - Only if implementation discovers a necessary behavior clarification; otherwise leave the approved spec unchanged.

### Task 1: Define the branch-aware flow schema

**Files:**
- Modify: `tool\web_terminal\scripts\generate_offline_flow.py`
- Test: `tool\web_terminal\scripts\test_generate_offline_flow.py`

- [ ] **Step 1: Write the failing schema test**

Add a fixture containing:

```c
printf("\n\r(1) First");
printf("\n\r(2) Second");
mh_test = mh_select_1_item();
switch (mh_test) {
case '1':
  if ((spisize == 0) && (endAddr == 0)) goto mh_spi_menu;
  printf("\n\r First input: ");
  mh_get_hex();
  mh_any_key();
  break;
case '2':
  if (mh_SR2 != 0x02) goto mh_spi_menu;
  printf("\n\r Second input: ");
  mh_get_dec();
  mh_any_key();
  break;
}
```

Assert that generation produces:

```python
{
    "key": "fixture",
    "entry": "root",
    "nodes": {
        "root": {
            "outputs": ["\n(1) First", "\n(2) Second"],
            "input": {"type": "select", "choices": {"1": "case_1", "2": "case_2"}}
        },
        "case_1": {
            "outputs": ["\n First input: "],
            "input": {"type": "hex", "next": "pause_1"}
        },
        "pause_1": {"input": {"type": "pause", "next": "return_menu"}}
    }
}
```

The fixture must prove that both hardware guards are absent from the generated flow.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
python .\tool\web_terminal\scripts\test_generate_offline_flow.py
```

Expected: FAIL because the generator and branch schema do not exist.

- [ ] **Step 3: Implement the smallest schema helpers**

Implement these standard-library-only helpers:

```python
def output_node(texts, next_node=None): ...
def input_node(kind, next_node=None, choices=None): ...
def pause_node(next_node="return_menu"): ...
def return_menu_node(): ...
```

Use plain dictionaries and lists. Do not add classes or a dependency.

- [ ] **Step 4: Run the focused test**

Run the same command. Expected: PASS for schema construction and the fixture shape.

- [ ] **Step 5: Commit**

```powershell
git add .\tool\web_terminal\scripts\generate_offline_flow.py .\tool\web_terminal\scripts\test_generate_offline_flow.py
git commit -m "test: define offline branch flow schema"
```

### Task 2: Parse C output and input operations

**Files:**
- Modify: `tool\web_terminal\scripts\generate_offline_flow.py`
- Test: `tool\web_terminal\scripts\test_generate_offline_flow.py`

- [ ] **Step 1: Add failing extraction tests**

Assert that the parser:

1. Reads `LP_ICIDCheck.c` as CP950.
2. Converts `printf("\n\rText %02x", value);` to `"\nText "`.
3. Preserves `\n`.
4. Converts `mh_get_dec()`, `mh_get_hex()`, `mh_are_you_sure()`,
   `mh_select_1_item()`, and `mh_any_key()` to input nodes.
5. Does not emit C variable names, source lines, comments, or hardware calls.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
python .\tool\web_terminal\scripts\test_generate_offline_flow.py
```

Expected: FAIL on missing C extraction.

- [ ] **Step 3: Implement literal and statement extraction**

Implement:

```python
def decode_c_string_literal(value: str) -> str: ...
def clean_printf_text(format_literal: str) -> str: ...
def extract_printf_statements(source: str) -> list[tuple[int, str]]: ...
def extract_input_statement(statement: str) -> str | None: ...
```

Rules:

- Decode C escapes with a small explicit mapping for `\\n`, `\\r`, `\\t`,
  `\\\\`, `\\"`, and hexadecimal escapes used in the file.
- Remove `\r`.
- Remove format placeholders with their conversion specifier only; do not
  replace them with fake values.
- Keep adjacent `printf` calls as separate output fragments until the
  node builder combines consecutive output fragments.
- Raise a clear error for an unterminated string instead of silently skipping it.

- [ ] **Step 4: Run extraction tests**

Run the focused test command. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add .\tool\web_terminal\scripts\generate_offline_flow.py .\tool\web_terminal\scripts\test_generate_offline_flow.py
git commit -m "feat: extract offline C printf and input nodes"
```

### Task 3: Build switch/case branches and ignore hardware guards

**Files:**
- Modify: `tool\web_terminal\scripts\generate_offline_flow.py`
- Test: `tool\web_terminal\scripts\test_generate_offline_flow.py`

- [ ] **Step 1: Add failing branch tests for real C cases**

Read `LP_ICIDCheck.c` and assert:

- Main case `a` contains the C Scan Vcc first-level choices.
- Main case `2` retains its Vcc choices and later input nodes.
- A branch containing `if ((spisize==0)&&(endAddr)==0)` still exposes the
  following `printf` and input node.
- A branch containing `mh_SR2 != 0x02` still exposes the following normal path.
- A `mh_any_key()` node has `next: "return_menu"` unless the source explicitly
  targets `mh_exit`.

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```powershell
python .\tool\web_terminal\scripts\test_generate_offline_flow.py
```

Expected: FAIL because the current parser has no branch graph.

- [ ] **Step 3: Implement bounded C control-flow scanning**

Implement:

```python
def find_matching_brace(source: str, open_index: int) -> int: ...
def extract_switch_cases(source: str, switch_start: int) -> dict[str, str]: ...
def is_hardware_only_condition(condition: str) -> bool: ...
def build_case_graph(case_source: str, case_key: str) -> dict: ...
def build_offline_menu(source: str) -> dict: ...
```

Implementation rules:

- Use brace-depth scanning, not a full C parser.
- Recognize `switch (...)`, `case 'x':`, `default:`, and nested switches.
- Preserve nested switches as `select` nodes with per-choice targets.
- Skip statements that are not `printf`, supported input helpers, `goto`,
  `switch`/`case`, or `mh_any_key`.
- Treat conditions referencing `spisize`, `endAddr`, `mh_MID`, `mh_DID`,
  `mh_SR`, `mh_SR1`, `mh_SR2`, and similar hardware state as transparent:
  do not create a failure branch and continue scanning the visible path.
- Do not invent output for skipped hardware calls or results.
- Convert `mh_any_key()` to a `pause` node whose default transition is
  `return_menu`.
- Convert `goto mh_spi_menu` to `return_menu` and `goto mh_exit` to `exit`.
- Reject duplicate node IDs or malformed case boundaries with explicit errors.

- [ ] **Step 4: Run real-case tests**

Run:

```powershell
python .\tool\web_terminal\scripts\test_generate_offline_flow.py
```

Expected: PASS, including `a Scan Vcc` and the guard-bypass assertions.

- [ ] **Step 5: Commit**

```powershell
git add .\tool\web_terminal\scripts\generate_offline_flow.py .\tool\web_terminal\scripts\test_generate_offline_flow.py
git commit -m "feat: build hardware-independent offline case graph"
```

### Task 4: Wire the generated graph into the browser runtime

**Files:**
- Modify: `tool\web_terminal\index.html:460-760`
- Test: `tool\web_terminal\scripts\test_generate_offline_flow.py`

- [ ] **Step 1: Add a failing runtime contract test**

Extend the generator test to verify emitted data contains:

```python
assert menu["children"]["a"]["entry"]
assert menu["children"]["a"]["nodes"]
assert menu["children"]["a"]["nodes"]["return_menu"]["type"] == "return-menu"
```

Also assert that no legacy `steps` array is emitted for generated items.

- [ ] **Step 2: Run the test and verify it fails**

Run the focused Python test. Expected: FAIL because the HTML still uses
linear `steps`.

- [ ] **Step 3: Replace the runtime flow state**

Replace the linear variables:

```javascript
let offlineStepIndex = 0;
let offlineInputPrompt = null;
```

with:

```javascript
let offlineNodeId = null;
let offlineInput = '';
```

Implement:

```javascript
function getOfflineNode() { ... }
function renderOfflineNode() { ... }
function advanceOfflineNode(nextNodeId) { ... }
function finishOfflineFlow(target) { ... }
```

Runtime rules:

- Render all consecutive `output` nodes before showing an input node.
- `select` uses the selected key to choose the node target.
- `dec`, `hex`, and `confirm` validate exactly as the current handler does.
- Blank `confirm` remains offline `y`; blank `dec`/`hex` remains accepted for
  C defaults.
- Any key at `pause` advances to its declared target.
- `return-menu` resets to `offlineMenu` and renders the C main menu.
- `exit` disables offline mode and updates the existing button.
- Focus `terminalScreen` after entering offline mode and after returning to the
  main menu.

- [ ] **Step 4: Run syntax validation**

Run:

```powershell
$html = Get-Content -Raw .\tool\web_terminal\index.html
$match = [regex]::Match($html, '<script type="module">\s*(?<code>[\s\S]*?)\s*</script>')
if (-not $match.Success) { throw '找不到 module script' }
$match.Groups['code'].Value | node --check
```

Expected: exit code `0`.

- [ ] **Step 5: Commit**

```powershell
git add .\tool\web_terminal\index.html
git commit -m "feat: run offline menu from branch graph"
```

### Task 5: Generate deployment data and verify browser behavior

**Files:**
- Modify: `tool\web_terminal\index.html`
- Test: `tool\web_terminal\scripts\test_generate_offline_flow.py`

- [ ] **Step 1: Generate the checked-in HTML data**

Run:

```powershell
python .\tool\web_terminal\scripts\generate_offline_flow.py `
  --source .\LP_ICIDCheck.c `
  --html .\tool\web_terminal\index.html
```

Expected: deterministic update of the generated flow data only.

- [ ] **Step 2: Run generator tests**

Run:

```powershell
python .\tool\web_terminal\scripts\test_generate_offline_flow.py
```

Expected: PASS.

- [ ] **Step 3: Run module syntax validation**

Run the Task 4 syntax command. Expected: exit code `0`.

- [ ] **Step 4: Run browser smoke checks**

With the existing local static server, verify:

1. Click `啟動離線選單`.
2. Press `a`; confirm Scan Vcc first-level C output appears.
3. Select a nested case; confirm only that case's outputs appear.
4. Enter through a branch containing `spisize/endAddr` or `mh_SR2` guards;
   confirm no guard blocks the next visible input/output.
5. Press any key at the case's final `mh_any_key`; confirm the C main menu
   is rendered again.
6. Press `Escape`; confirm return to the main menu.
7. Confirm no Writer connection is opened and no hardware result text is
   fabricated.

- [ ] **Step 5: Review the final diff**

Run:

```powershell
git --no-pager diff --check
git status --short
```

Expected: no new unrelated files are modified and all generated output is
deterministic.

- [ ] **Step 6: Commit the generated deployment result**

```powershell
git add .\tool\web_terminal\index.html .\tool\web_terminal\scripts
git commit -m "feat: regenerate offline programmer case flows"
```

## Plan self-review

- Spec coverage:
  - Hardware guard bypass: Task 3.
  - Preserved nested switch branches: Tasks 3 and 4.
  - C printf-only output: Task 2 and Task 4.
  - Input helper semantics: Tasks 2 and 4.
  - `mh_any_key` return to main menu: Tasks 3 and 4.
  - `goto mh_spi_menu` / `goto mh_exit`: Tasks 3 and 4.
  - Browser and syntax validation: Task 5.
- No placeholder markers or undefined task references remain.
- Node names and runtime properties are consistent: `entry`, `nodes`,
  `output`, `input`, `return-menu`, and `exit`.
