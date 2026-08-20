import unittest

from generate_offline_flow import (
    clean_printf_text,
    decode_c_string_literal,
    extract_input_statement,
    build_linear_steps,
    build_missing_main_cases,
    extract_main_case_sources,
    extract_switch_case_sources,
    extract_printf_statements,
    input_node,
    output_node,
    pause_node,
    return_menu_node,
)


FIXTURE = r"""printf("\n\r(1) First");
printf("\n\r(2) Second");
mh_test = mh_select_1_item();
switch (mh_test) { case '1': if ((spisize == 0) && (endAddr == 0)) goto mh_spi_menu; printf("\n\r First input: "); mh_get_hex(); mh_any_key(); break; case '2': if (mh_SR2 != 0x02) goto mh_spi_menu; printf("\n\r Second input: "); mh_get_dec(); mh_any_key(); break; }"""


class OfflineFlowSchemaTests(unittest.TestCase):
    def test_output_node_shape(self):
        node = output_node(["\n\r(1) First", "\n\r(2) Second"], "select_item")

        self.assertEqual(
            node,
            {
                "type": "output",
                "texts": ["\n\r(1) First", "\n\r(2) Second"],
                "next": "select_item",
            },
        )

    def test_input_node_shape_and_choices(self):
        node = input_node("select", "branch", choices=["1", "2"])

        self.assertEqual(
            node,
            {
                "type": "input",
                "kind": "select",
                "next": "branch",
                "choices": ["1", "2"],
            },
        )

    def test_optional_values_are_omitted(self):
        self.assertEqual(
            output_node(["text"]),
            {"type": "output", "texts": ["text"], "next": None},
        )
        self.assertEqual(
            input_node("hex"),
            {"type": "input", "kind": "hex", "next": None},
        )

    def test_pause_and_return_menu_shapes(self):
        self.assertEqual(pause_node(), {"type": "pause", "next": "return_menu"})
        self.assertEqual(pause_node("menu"), {"type": "pause", "next": "menu"})
        self.assertEqual(return_menu_node(), {"type": "return_menu"})

    def test_fixture_keeps_hardware_guards_out_of_input_schema(self):
        flow = [
            output_node([FIXTURE.splitlines()[0], FIXTURE.splitlines()[1]]),
            input_node("select", choices=["1", "2"]),
            output_node(
                [
                    "if ((spisize == 0) && (endAddr == 0)) goto mh_spi_menu;",
                    'printf("\\n\\r First input: ");',
                    "if (mh_SR2 != 0x02) goto mh_spi_menu;",
                    'printf("\\n\\r Second input: ");',
                ]
            ),
        ]

        input_nodes = [node for node in flow if node["type"] == "input"]
        self.assertEqual(len(input_nodes), 1)
        self.assertEqual(input_nodes[0]["choices"], ["1", "2"])
        self.assertIn("spisize", flow[2]["texts"][0])
        self.assertIn("endAddr", flow[2]["texts"][0])
        self.assertIn("mh_SR2", flow[2]["texts"][2])
        self.assertNotIn("spisize", input_nodes[0])
        self.assertNotIn("endAddr", input_nodes[0])
        self.assertNotIn("mh_SR2", input_nodes[0])

    def test_decode_and_clean_printf(self):
        self.assertEqual(decode_c_string_literal(r"\n\rText\t\\\""), '\n\rText\t\\"')
        self.assertEqual(clean_printf_text(r"\n\rText %02x %d %s"), "\nText   ")

    def test_extract_printf_and_input_helpers(self):
        source = r'''
        printf("\n\rText %02x", value);
        mh_get_dec();
        mh_get_hex();
        mh_are_you_sure();
        mh_select_1_item();
        mh_any_key();
        FPGA_WRITE(value);
        '''
        outputs = extract_printf_statements(source)
        self.assertEqual(outputs, [(9, "\nText ")])
        self.assertEqual(
            [
                extract_input_statement("mh_get_dec();"),
                extract_input_statement("mh_get_hex();"),
                extract_input_statement("mh_are_you_sure();"),
                extract_input_statement("mh_select_1_item();"),
                extract_input_statement("mh_any_key();"),
            ],
            ["dec", "hex", "confirm", "select", "pause"],
        )
        self.assertIsNone(extract_input_statement("FPGA_WRITE(value);"))

    def test_extract_main_cases_and_ignore_hardware_guards(self):
        source = (
            "mh_spi_menu:\n"
            "\t\tcase 'r':\n"
            '\t\t\tprintf("\\n\\r Reload");\n'
            "\t\t\tbreak;\n"
            "\t\tcase 'c':\n"
            "\t\t\tif ((spisize == 0) && (endAddr == 0)) goto mh_spi_menu;\n"
            '\t\t\tprintf("\\n\\r Change delay");\n'
            "\t\t\tmh_get_dec();\n"
            "\t\t\tmh_any_key();\n"
            "\t\tcase 'd':\n"
            '\t\t\tprintf("\\n\\r QPI read");\n'
        )
        cases = extract_main_case_sources(source)
        self.assertEqual(set(cases), {"r", "c", "d"})
        self.assertEqual(
            build_linear_steps(cases["c"]),
            [["o", "\n Change delay"], ["i", "dec"], ["i", "pause"]],
        )
        missing = build_missing_main_cases(source, existing_keys={"r"})
        self.assertEqual(set(missing), {"c", "d"})

    def test_extract_main_cases_accepts_mixed_case_indentation(self):
        source = (
            "mh_spi_menu:\n"
            "\t\tcase '0':\n"
            "\t\t\tprintf(\"\\n\\r Read ID\");\n"
            "\t  case 'a':\n"
            "\t\t\tprintf(\"\\n\\r Scan Vcc\");\n"
            "\t  case 'k':\n"
            "\t\t\tprintf(\"\\n\\r Relay\");\n"
        )

        cases = extract_main_case_sources(source)

        self.assertEqual(set(cases), {"0", "a", "k"})
        self.assertEqual(build_linear_steps(cases["a"]), [["o", "\n Scan Vcc"]])

    def test_ignored_spi_size_guard_does_not_create_an_input(self):
        source = """
        if((spisize==0)&&(endAddr)==0)
        {
            printf("\\n\\r Input SPI size : ");
            spisize=mh_get_dec();
        }
        switch (mh_test)
        {
        case '1':
            printf("\\n\\r Single page program : ");
            mh_get_hex();
            mh_any_key();
        }
        """

        steps = build_linear_steps(source)

        self.assertEqual(
            steps,
            [["o", "\n Single page program : "], ["i", "hex"], ["i", "pause"]],
        )

    def test_extract_nested_program_cases(self):
        source = """
        switch (mh_test)
        {
        case '1':
            printf("\\n\\r Single page program : ");
            mh_any_key();
        case '2':
            printf("\\n\\r Multi page program : ");
            mh_any_key();
        }
        """

        cases = extract_switch_case_sources(source)

        self.assertEqual(set(cases), {"1", "2"})
        self.assertEqual(
            build_linear_steps(cases["1"]),
            [["o", "\n Single page program : "], ["i", "pause"]],
        )


if __name__ == "__main__":
    unittest.main()
