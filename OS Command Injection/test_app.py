import unittest

from app import safe_command, vulnerable_command


class CommandInjectionLabTests(unittest.TestCase):
    def test_vulnerable_variant_runs_harmless_injected_echo(self) -> None:
        output = vulnerable_command("hello & echo INJECTED")
        self.assertIn("hello", output)
        self.assertIn("INJECTED", output)

    def test_safe_variant_treats_same_payload_as_literal_data(self) -> None:
        payload = "hello & echo INJECTED"
        self.assertEqual(safe_command(payload), payload)


if __name__ == "__main__":
    unittest.main()
