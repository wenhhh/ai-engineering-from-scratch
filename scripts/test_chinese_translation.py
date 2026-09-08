"""Run with: python3 -m unittest discover -s scripts -p test_chinese_translation.py."""

import json
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from audit_chinese_translation import audit_file, markdown_issues, quiz_issues, svg_issues, unchanged_english


class TranslationAuditTest(unittest.TestCase):
    def test_certification_bilingual_headings_and_length(self):
        import audit_certifications as cert
        for heading, labels in cert.CHINESE_HEADINGS.items():
            self.assertTrue(cert.has_heading("## " + heading, heading))
            for label in labels:
                self.assertTrue(cert.has_heading(f"## {label}（{heading}）", heading))
            for invalid in (f"### {heading}", f"Mention ## {heading}", f"## 示例（{heading} missing）"):
                self.assertFalse(cert.has_heading(invalid, heading))
        for text, expected in (("word " * 20, 20), ("汉" * 40, 20),
                               ("汉" * 20 + " API" * 10, 20), ("。，！ ", 0)):
            self.assertEqual(cert.word_equivalents(text), expected)
        lesson = next(cert.LESSONS_DIR.iterdir())
        read_text = Path.read_text
        for text, thin in (("word " * 800, False), ("汉" * 1600, False),
                           ("word " * 799, True), ("汉" * 1599, True)):
            def lesson_text(path, *args, **kwargs):
                return text if path == lesson / "docs/en.md" else read_text(path, *args, **kwargs)
            audit = cert.Audit()
            with patch.object(Path, "read_text", lesson_text):
                cert.check_lesson(audit, lesson)
            self.assertEqual(any("too thin" in finding.message for finding in audit.findings), thin)

    def test_certification_rationale_and_association_remain_strict(self):
        import audit_certifications as cert
        question = {"id": "test-question", "domain": "test-domain", "objective": "检查证据（Check evidence）",
                    "prompt": "请选择证据。", "type": "single", "options": ["甲", "乙", "丙", "丁"],
                    "correct": [0], "explanation": "汉" * 40, "references": []}
        def rules(value):
            audit = cert.Audit()
            cert.check_assessment_question(audit, Path("test.json"), value, 0, {"test-domain"},
                                           {"test-domain": {question["objective"]}}, set(), set())
            return {finding.rule for finding in audit.findings}
        for explanation in ("word " * 20, "汉" * 40):
            self.assertNotIn("C058", rules({**question, "explanation": explanation}))
        for explanation in ("word " * 19, "汉" * 39, "", 123):
            self.assertIn("C058", rules({**question, "explanation": explanation}))
        for change, rule in (({"objective": "别的目标（Other objective）"}, "C065"),
                             ({"domain": "other"}, "C052"), ({"id": "中文ID"}, "C004"),
                             ({"correct": [4]}, "C056"), ({"correct": [0, 1]}, "C057")):
            self.assertIn(rule, rules({**question, **change}))

    def test_answer_length_warnings_work_in_both_languages(self):
        import audit_certifications as cert
        for short, long in (("one", "one two three four"), ("甲乙", "甲乙丙丁戊己庚辛")):
            for longest in (True, False):
                questions = []
                for index in range(4):
                    options = [short if longest else long] * 4
                    options[index] = long if longest else short
                    questions.append({"options": options, "correct": [index]})
                audit = cert.Audit()
                cert.check_answer_quality(audit, Path("quiz.json"), questions)
                rules = {finding.rule for finding in audit.findings}
                self.assertIn("C069", rules)
                self.assertEqual("C068" in rules, longest)
                self.assertNotIn("C066", rules)
                self.assertNotIn("C067", rules)
            audit = cert.Audit()
            cert.check_answer_quality(audit, Path("quiz.json"), [
                {"options": [short] * 4, "correct": [index]} for index in range(4)
            ])
            self.assertEqual(audit.findings, [])

    def test_bilingual_assessment_objective_is_not_a_machine_value_exemption(self):
        from audit_chinese_translation import assessment_issues, track_objective_issues
        from copy import deepcopy
        path = "certifications/claude/assessments/example/diagnostic.json"
        track = {"id": "example", "domains": [
            {"id": "one", "weight": 50, "objectives": ["Check evidence", "Review risks"]},
            {"id": "two", "weight": 50, "objectives": ["Choose tools"]}],
            "assessments": [{"path": path}]}
        translated_track = deepcopy(track)
        for domain in translated_track["domains"]:
            domain["objectives"] = [f"检查目标（{value}）" for value in domain["objectives"]]
        source = {"track": "example", "kind": "diagnostic", "questions": [
            {"id": "question-one", "domain": "one", "objective": "Check evidence", "type": "single",
             "options": ["one", "two"], "correct": [0]},
            {"id": "question-two", "domain": "two", "objective": "Choose tools", "type": "single",
             "options": ["one", "two"], "correct": [1]}]}
        target = deepcopy(source)
        for question in target["questions"]:
            question["objective"] = f'检查目标（{question["objective"]}）'
        def issues(value, manifest=translated_track):
            with patch("audit_chinese_translation.git", return_value=json.dumps(track)), \
                 patch.object(Path, "read_text", return_value=json.dumps(manifest)):
                return assessment_issues(path, json.dumps(source), json.dumps(value), "HEAD")
        self.assertEqual(issues(target), [])
        for malformed in ([], {**target, "questions": None}, {**target, "questions": [None]}):
            self.assertTrue(issues(malformed))
        for malformed_track in ([], {**translated_track, "domains": None},
                                {**translated_track, "domains": [None, None]}):
            self.assertTrue(issues(target, malformed_track))
        for key, value in (("objective", "检查目标"), ("objective", "检查目标（Check evidence changed）"),
                           ("objective", "检查目标（Review risks）"), ("domain", "two"),
                           ("id", "changed-id"), ("type", "multiple"), ("correct", [1])):
            changed = deepcopy(target)
            changed["questions"][0][key] = value
            self.assertTrue(issues(changed), (key, value))
        changed = deepcopy(target)
        changed["questions"].reverse()
        self.assertTrue(issues(changed))
        changed_track = deepcopy(translated_track)
        changed_track["domains"][0]["objectives"].reverse()
        self.assertTrue(issues(target, changed_track))
        changed_track = deepcopy(translated_track)
        changed_track["domains"][0]["objectives"][0] = "另一译法（Check evidence）"
        self.assertTrue(issues(target, changed_track))
        changed_track = deepcopy(translated_track)
        changed_track["domains"].reverse()
        self.assertTrue(track_objective_issues(track, changed_track))
        self.assertTrue(quiz_issues('{"objective":"machine-id"}', '{"objective":"机器（machine-id）"}'))

    def test_guide_boundaries_and_route_counts_in_both_languages(self):
        import audit_certifications as cert
        read_text = Path.read_text
        replacements = {
            cert.GETTING_STARTED_PATH: ("不将其纳入仓库的 EPUB/PDF 电子书流程", "not included in the repository's EPUB/PDF book workflow"),
            cert.CERT_README_PATH: ("不将它纳入 EPUB/PDF 电子书流程", "outside the EPUB/PDF book workflow"),
        }
        for language in ("zh", "en"):
            def translated(path, *args, **kwargs):
                text = read_text(path, *args, **kwargs)
                if language == "en":
                    import re
                    text = text.replace("与 Anthropic 无隶属关系", "not affiliated with Anthropic")
                    if path in replacements:
                        text = text.replace(*replacements[path])
                    if path == cert.CERT_README_PATH:
                        text = re.sub(r"(\d+) 课 \|", r"\1 lessons |", text)
                return text
            with patch.object(Path, "read_text", translated):
                audit = cert.run_audit()
            self.assertFalse([f for f in audit.findings if f.rule in {"C007", "C008", "C080"}])
        for path, (boundary, _) in replacements.items():
            def missing(p, *args, **kwargs):
                text = read_text(p, *args, **kwargs)
                return text.replace(boundary, "边界已删除") if p == path else text
            audit = cert.Audit()
            with patch.object(Path, "read_text", missing):
                cert.check_ai_native_learning_surface(audit, set())
            self.assertTrue(any(f.rule == "C080" for f in audit.findings))
        def wrong_count(path, *args, **kwargs):
            text = read_text(path, *args, **kwargs)
            return text.replace("9 课 |", "8 课 |") if path == cert.CERT_README_PATH else text
        with patch.object(Path, "read_text", wrong_count):
            self.assertTrue(any(f.rule == "C008" for f in cert.run_audit().findings))
        for text in ("not affiliated with Anthropic", "与 Anthropic 无隶属关系"):
            self.assertTrue(cert.has_non_affiliation(text))
        for text in ("affiliated with Anthropic", "与 Anthropic 有隶属关系", "无隶属关系"):
            self.assertFalse(cert.has_non_affiliation(text))

    def test_lesson_type_remains_machine_readable(self):
        source = "# Lesson\n\n**Type:** Capstone\n**Language:** Python\n**Time:** 90 minutes\n"
        target = "# 课程\n\n**Type:** Capstone\n**Language:** Python\n**Time:** 90 分钟\n"
        self.assertEqual(markdown_issues(source, target), [])
        for changed in (target.replace("Capstone", "综合项目（Capstone）"),
                        target.replace("**Type:**", "**类型：**"),
                        target.replace("**Type:** Capstone", "")):
            self.assertIn("lesson_type_metadata_changed", markdown_issues(source, changed))
        self.assertIn("lesson_metadata_fields_changed",
                      markdown_issues(source, target.replace("**Language:**", "**语言：**")))

    def test_certification_tutor_boundaries_are_still_required(self):
        import audit_certifications as cert
        read_text = Path.read_text
        def without_boundaries(path, *args, **kwargs):
            text = read_text(path, *args, **kwargs)
            if path == cert.CERT_SKILL_PATH:
                for statement in ("测评模式（Assessment Mode）", "不得编造虚假 API 代码", "不得送入仓库的电子书生成流水线"):
                    text = text.replace(statement, "规则已删除")
            return text
        audit = cert.Audit()
        with patch.object(Path, "read_text", without_boundaries):
            cert.check_ai_native_learning_surface(audit, set())
        findings = [finding for finding in audit.findings if "certification tutor skill is missing" in finding.message]
        self.assertEqual(len(findings), 3)

    def test_public_certification_disclaimer_is_still_required(self):
        import audit_certifications as cert
        read_text = Path.read_text
        def without_disclaimer(path, *args, **kwargs):
            text = read_text(path, *args, **kwargs)
            return text.replace("无隶属关系", "声明已删除") if path in cert.PUBLIC_CERT_PAGES else text
        with patch.object(Path, "read_text", without_disclaimer):
            audit = cert.run_audit()
        findings = [finding for finding in audit.findings if finding.rule == "C007"]
        self.assertEqual(len(findings), len(cert.PUBLIC_CERT_PAGES))

    def test_indented_fences_are_not_english_prose(self):
        source = "# Debug\n\n1. Run this check.\n\n   ```python\n   # Check every single input before running the model\n   assert x.shape == (2, 3)\n   ```\n"
        target = source.replace("# Debug", "# 调试（Debug）").replace("Run this check.", "执行这项检查。")
        self.assertFalse(unchanged_english(source, target))
        self.assertEqual(markdown_issues(source, target), [])
        self.assertIn("code_fence_count_or_languages_changed", markdown_issues(source, target.replace("```python", "```bash")))

    def test_certification_book_boundary_is_still_required(self):
        import audit_certifications as cert
        read_text = Path.read_text
        def without_boundary(path, *args, **kwargs):
            text = read_text(path, *args, **kwargs)
            return text.replace("认证课程有意不纳入书籍转换流程", "说明已删除") if path == cert.ROOT_README_PATH else text
        audit = cert.Audit()
        with patch.object(Path, "read_text", without_boundary):
            cert.check_ai_native_learning_surface(audit, set())
        self.assertTrue(any("intentionally not converted into the books" in finding.message for finding in audit.findings))

    def test_learning_path_machine_values_are_preserved(self):
        source = {"title": "Skills", "lessons": [{"path": "phases/13/example", "order": 1}],
                  "expectedEvidence": ["Run the test"], "command": "python3 main.py"}
        target = {**source, "title": "技能（Skills）", "expectedEvidence": ["执行测试"]}
        def issues(value):
            return audit_file("learning-paths/example.json", json.dumps(source), json.dumps(value))["issues"]
        self.assertEqual(issues(target), [])
        self.assertTrue(issues({**target, "command": "python3 other.py"}))
        self.assertTrue(issues({**target, "lessons": [{"path": "phases/13/other", "order": 1}]}))
        self.assertTrue(issues({**target, "expectedEvidence": [123]}))

    def test_svg_text_does_not_change_geometry(self):
        source = '<svg viewBox="0 0 100 50"><rect id="r" width="80" height="20"/><text x="4" y="10">Encoder</text></svg>'
        target = source.replace('Encoder', '编码器（Encoder）')
        self.assertEqual(svg_issues(source, target), [])
        self.assertIn("svg_geometry_changed", svg_issues(source, target.replace('width="80"', 'width="90"')))

    def test_bilingual_counts_still_reject_drift(self):
        import check_readme_counts as counts
        source = '''lessons-523-3553ff phases-20-3553ff
alt="523 课" alt="20 个阶段"
> 523 课，20 个阶段，约 342 小时。
本课程提供贯穿始终的主线：20 个阶段、523 课、四种语言。
包含 523 件交付物
本仓库提供 396 个技能和 99 个提示词
采用 MIT 许可证，共 523 课
'''
        totals = {"lessons": 523, "phases": 20, "skills": 396, "prompts": 99}
        self.assertEqual(counts.find_mismatches(source, totals), [])
        self.assertTrue(counts.find_mismatches(source.replace("包含 523", "包含 522"), totals))
        self.assertEqual(counts.canonical_title("基础（Foundations） · 数学（Math）"), "Foundations · Math")

    def test_bilingual_book_sections(self):
        import build_book
        source = Mock()
        source.read_text.return_value = "# 示例\n\n## 交付成果（Ship It）\nARTIFACT_BODY\n\n## 练习（Exercises）\n1. 完成练习。\n"
        with patch.object(build_book, "_lesson_source", return_value=source):
            output = "\n".join(build_book.transform_lesson("00-setup-and-tooling", Path("01-example")))
        self.assertNotIn("ARTIFACT_BODY", output)
        self.assertIn("## 练习（Exercises）", output)
        self.assertIn("起始代码", output)

    def test_structure_and_quiz_invariants(self):
        self.assertEqual(markdown_issues("$750 Silver is above $500 Gold.",
                                        "$750 白银档高于 $500 黄金档。"), [])
        source = "# Title\n\nRead the complete explanation before running the experiment.\n\n[Docs](../docs/en.md) `x` $x^2$\n\n```figure\nmodel-id\n```\n"
        target = "# 标题（Title）\n\n运行实验前，请阅读完整说明。\n\n[文档](../docs/en.md) `x` $x^2$\n\n```figure\nmodel-id\n```\n"
        self.assertEqual(markdown_issues(source, target), [])
        self.assertIn("link_targets_changed", markdown_issues(source, target.replace("../docs/en.md", "../wrong.md")))
        self.assertIn("figure_identifiers_changed", markdown_issues(source, target.replace("model-id", "模型")))
        self.assertIn("inline_math_changed", markdown_issues(source, target.replace("$x^2$", "$x^3$")))
        self.assertEqual(audit_file("docs/en.md", source, source)["state"], "unchanged")
        self.assertTrue(unchanged_english(source, source))
        self.assertFalse(unchanged_english(source, target))
        self.assertEqual(markdown_issues("Read `# requires: pkg1,\npkg2` then `needs <deps>`.",
                                        "读取 `# requires: pkg1,\npkg2`，然后检查 `needs <deps>`。"), [])
        quiz = {"lesson": "01-example", "title": "Example", "questions": [
            {"stage": "pre", "question": "Which?", "options": ["One", "Two"], "correct": 1, "explanation": "Two fits."}
        ]}
        translated = json.loads(json.dumps(quiz))
        translated["questions"][0].update(question="哪一个？", options=["一", "二"], explanation="二符合要求。")
        self.assertEqual(quiz_issues(json.dumps(quiz), json.dumps(translated)), [])
        translated["questions"][0]["correct"] = 0
        self.assertTrue(quiz_issues(json.dumps(quiz), json.dumps(translated)))


if __name__ == "__main__":
    unittest.main()
