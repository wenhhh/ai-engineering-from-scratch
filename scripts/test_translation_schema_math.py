"""JSON Schema dollar names must not masquerade as translated math."""
import unittest

from audit_chinese_translation import markdown_issues


class SchemaMathBoundaryTest(unittest.TestCase):
    def test_json_schema_reference_sentence_is_not_math(self):
        source = '# Schema\n\nA $ref resolves outside, unlike #/$defs/Sku.\n'
        target = '# 模式\n\n$ref 可能指向外部，#/$defs/Sku 则指向本文档。\n'
        self.assertEqual(markdown_issues(source, target), [])

    def test_plain_schema_keyword_change_is_not_hidden(self):
        source = '# Schema\n\nA $ref points to #/$defs/Sku.\n'
        target = '# 模式\n\n$schema 指向 #/$defs/Sku。\n'
        self.assertIn('json_schema_keywords_changed', markdown_issues(source, target))

    def test_regular_inline_formula_remains_protected(self):
        source = '# Math\n\nCompute $x^2$ and $ref + 1$.\n'
        target = '# 数学\n\n计算 $x^2$ 和 $ref + 1$。\n'
        self.assertEqual(markdown_issues(source, target), [])
        self.assertIn('inline_math_changed', markdown_issues(source, target.replace('$x^2$', '$x^3$')))
        self.assertIn('inline_math_changed', markdown_issues(source, target.replace('$ref + 1$', '$ref + 2$')))

    def test_schema_named_math_variable_remains_protected(self):
        source = '# Math\n\nUse $ref$.\n'
        target = '# 数学\n\n使用 $ref$。\n'
        self.assertEqual(markdown_issues(source, target), [])
        self.assertIn('inline_math_changed', markdown_issues(source, target.replace('$ref$', '$defs$')))

    def test_inline_code_dollars_remain_code(self):
        source = '# Schema\n\nRead `$ref` and `#/$defs/Sku`, then $x^2$.\n'
        target = '# 模式\n\n读取 `$ref` 和 `#/$defs/Sku`，再计算 $x^2$。\n'
        self.assertEqual(markdown_issues(source, target), [])
        self.assertIn('inline_code_changed', markdown_issues(source, target.replace('`$ref`', '`$schema`')))

    def test_display_math_remains_protected(self):
        source = '# Math\n\n$$x^2 + y^2$$\n'
        target = '# 数学\n\n$$x^3 + y^2$$\n'
        self.assertIn('display_math_changed', markdown_issues(source, target))


if __name__ == '__main__':
    unittest.main()
