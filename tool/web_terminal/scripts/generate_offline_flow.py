import re


INPUT_HELPERS = {
    "mh_get_dec": "dec",
    "mh_get_hex": "hex",
    "mh_are_you_sure": "confirm",
    "mh_select_1_item": "select",
    "mh_any_key": "pause",
}


def output_node(texts, next_node=None):
    return {"type": "output", "texts": list(texts), "next": next_node}


def input_node(kind, next_node=None, choices=None):
    node = {"type": "input", "kind": kind, "next": next_node}
    if choices is not None:
        node["choices"] = list(choices)
    return node


def pause_node(next_node="return_menu"):
    return {"type": "pause", "next": next_node}


def return_menu_node():
    return {"type": "return_menu"}


def decode_c_string_literal(value):
    result = []
    index = 0
    escapes = {
        "n": "\n",
        "r": "\r",
        "t": "\t",
        "\\": "\\",
        '"': '"',
    }
    while index < len(value):
        char = value[index]
        if char != "\\":
            result.append(char)
            index += 1
            continue
        index += 1
        if index >= len(value):
            raise ValueError("unterminated C string escape")
        escaped = value[index]
        if escaped == "x":
            match = re.match(r"[0-9a-fA-F]{2}", value[index + 1 :])
            if not match:
                raise ValueError("invalid hexadecimal C string escape")
            result.append(chr(int(match.group(0), 16)))
            index += 1 + len(match.group(0))
            continue
        result.append(escapes.get(escaped, escaped))
        index += 1
    return "".join(result)


def clean_printf_text(format_literal):
    text = decode_c_string_literal(format_literal).replace("\r", "")
    return re.sub(
        r"%(?:[-+ #0]?\d*(?:\.\d+)?(?:hh|h|ll|l|L|z|j|t)?[diouxXfFeEgGaAcsp])",
        "",
        text,
    )


def extract_printf_statements(source):
    statements = []
    pattern = re.compile(r"printf\s*\(\s*(['\"])(.*?)\1", re.DOTALL)
    for match in pattern.finditer(source):
        statements.append((match.start(), clean_printf_text(match.group(2))))
    return statements


def extract_input_statement(statement):
    for helper, kind in INPUT_HELPERS.items():
        if re.search(rf"\b{re.escape(helper)}\s*\(", statement):
            return kind
    return None


IGNORED_HARDWARE_GUARDS = (
    "spisize",
    "endAddr",
    "mh_MID",
    "mh_DID",
    "mh_SR",
)


def _masked_c_source(source):
    masked = list(source)
    index = 0
    state = "code"
    while index < len(source):
        if state == "code":
            if source.startswith("//", index):
                masked[index:index + 2] = [" ", " "]
                index += 2
                state = "line"
            elif source.startswith("/*", index):
                masked[index:index + 2] = [" ", " "]
                index += 2
                state = "block"
            elif source[index] == '"':
                masked[index] = " "
                index += 1
                state = "string"
            else:
                index += 1
        elif state == "line":
            if source[index] == "\n":
                state = "code"
            else:
                masked[index] = " "
            index += 1
        elif state == "block":
            if source.startswith("*/", index):
                masked[index:index + 2] = [" ", " "]
                index += 2
                state = "code"
            else:
                if source[index] != "\n":
                    masked[index] = " "
                index += 1
        else:
            if source[index] == "\\":
                masked[index:index + 2] = [" ", " "]
                index += 2
            elif source[index] == '"':
                masked[index] = " "
                index += 1
                state = "code"
            else:
                if source[index] != "\n":
                    masked[index] = " "
                index += 1
    return "".join(masked)


def _matching_brace(source, opening):
    depth = 0
    for index in range(opening, len(source)):
        if source[index] == "{":
            depth += 1
        elif source[index] == "}":
            depth -= 1
            if depth == 0:
                return index
    raise ValueError("unmatched C brace")


def remove_ignored_hardware_guards(source):
    masked = _masked_c_source(source)
    removals = []
    for match in re.finditer(r"\bif\s*\([^{}\n]*\)", masked):
        condition = match.group(0)
        if not any(name in condition for name in IGNORED_HARDWARE_GUARDS):
            continue
        next_token = match.end()
        while next_token < len(masked) and masked[next_token].isspace():
            next_token += 1
        block_start = next_token if next_token < len(masked) and masked[next_token] == "{" else -1
        statement_end = masked.find("\n", match.end())
        if block_start != -1:
            removals.append((match.start(), _matching_brace(masked, block_start) + 1))
        else:
            removals.append((match.start(), statement_end if statement_end != -1 else len(source)))
    for start, end in reversed(removals):
        source = source[:start] + source[end:]
    return source


def extract_main_case_sources(source):
    lines = source.splitlines()
    anchor = next(
        index for index, line in enumerate(lines) if "mh_spi_menu:" in line
    )
    labels = []
    for index in range(anchor + 1, len(lines)):
        match = re.match(r"^(?:\t{2}|\t  )case\s+'([^']+)'\s*:", lines[index])
        if match:
            labels.append((match.group(1), index))
    cases = {}
    for offset, (key, start) in enumerate(labels):
        end = labels[offset + 1][1] if offset + 1 < len(labels) else len(lines)
        cases.setdefault(key, "\n".join(lines[start:end]))
    return cases


def extract_switch_case_sources(source, switch_marker="switch (mh_test)"):
    masked = _masked_c_source(source)
    switch_start = masked.find(switch_marker)
    if switch_start == -1:
        return {}
    opening = masked.find("{", switch_start)
    closing = _matching_brace(masked, opening)
    labels = []
    for match in re.finditer(r"(?m)^[ \t]*case\s+'([^']+)'\s*:", masked[opening + 1:closing]):
        absolute = opening + 1 + match.start()
        depth = masked[opening + 1:absolute].count("{") - masked[opening + 1:absolute].count("}")
        if depth == 0:
            labels.append((match.group(1), opening + 1 + match.end()))
    cases = {}
    for offset, (key, start) in enumerate(labels):
        end = labels[offset + 1][1] if offset + 1 < len(labels) else closing
        cases.setdefault(key, source[start:end])
    return cases


def build_linear_steps(case_source):
    case_source = remove_ignored_hardware_guards(case_source)
    steps = []
    for line in case_source.splitlines():
        if "mh_any_key" in line:
            steps.append(["i", "pause"])
            break
        for _, text in extract_printf_statements(line):
            if text:
                steps.append(["o", text])
        input_kind = extract_input_statement(line)
        if input_kind and input_kind != "pause":
            steps.append(["i", input_kind])
    return steps


def build_missing_main_cases(source, existing_keys=()):
    cases = extract_main_case_sources(source)
    missing = {}
    for key, case_source in cases.items():
        if key not in existing_keys:
            missing[key] = {
                "key": key,
                "steps": build_linear_steps(case_source),
            }
    return missing
