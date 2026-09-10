import argparse
import re
import shutil
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch

import build_book


ROOT = Path(__file__).resolve().parents[1]
FILTER = ROOT / "book" / "literal-tokens.lua"
PDF_SOURCE_FORMAT = "markdown+fenced_divs+autolink_bare_uris"
LONG_LINES = """# Wrapping regression

```python
message = "Every sample in the batch must be pre-padded with the same number of image placeholders before replacing them with projected image embeddings."
identifier = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
```

```text
This plain-text code block must also wrap its long lines without losing the final marker: PLAIN_TEXT_END.
```

Further reading: (http://neuralnetworksanddeeplearning.com/). Keep the URL clickable.

- PaddleOCR is mature, fast, and multilingual. One-line usage: `paddleocr.PaddleOCR(lang="en").ocr(image_path)`.
- A long MCP identifier: `params._meta.io.modelcontextprotocol/protocolVersion`.

| Leaderboard | Tracks | URL |
| --- | --- | --- |
| Open ASR Leaderboard | English and multilingual | `huggingface.co/spaces/hf-audio/open_asr_leaderboard` |
| TTS Arena | English TTS | `huggingface.co/spaces/TTS-AGI/TTS-Arena` |
| Escaping | Literal symbols | `{value}#100%_ok` |
| Unicode | Literal multiplication | `k × sr / N` |

| Mistake | Why it is bad | Fix |
| --- | --- | --- |
| Fitting on full data before splitting | Data leakage | Use Pipeline with cross_val_score |
| Feature engineering outside the pipeline | Different transforms at train vs serve | Put all transforms in the Pipeline |
| Not handling unknown categories | Production crash on new values | OneHotEncoder(handle_unknown="ignore") |
| Hardcoded column names | Breaks when features change | Use column lists from config |
| No data validation | Silently wrong predictions | Add schema checks before prediction |
| Training/serving skew | Model sees different features in prod | One Pipeline object for both |
| A long plain identifier | Must remain readable in a narrow table cell | Abcdefghijklmnopqrstuvwxyz0123456789Abcdefghijklmnopqrstuvwxyz0123456789 |
"""


def render(source, output="html", lua_filter=FILTER):
    return subprocess.run(
        ["pandoc", "--from", "markdown+fenced_divs", "--to", output,
         "--lua-filter", str(lua_filter)],
        input=source, text=True, capture_output=True, check=True,
    ).stdout


class BookRenderingTest(unittest.TestCase):
    def test_literal_tokens_remain_text_in_valid_xhtml(self):
        source = 'Prompt: "<image A> caption <image B>". Replace a name with "<PERSON>".\n\n'
        source += '| Token | Meaning |\n| --- | --- |\n| <image> | Image |\n| <doc A> | Context |\n'
        source += '\n在“<图像 A> 描述 A <图像 B> 描述 B”中交错输入。\n'
        root = ET.fromstring("<div>" + render(source) + "</div>")
        text = "".join(root.itertext())
        for token in ("<image>", "<image A>", "<image B>", "<PERSON>", "<doc A>", "<图像 A>", "<图像 B>"):
            self.assertIn(token, text)

    def test_code_and_real_html_are_unchanged(self):
        source = 'Keep `<image>` and <em>emphasis</em>.\n\n```text\n<PERSON> <doc A>\n```\n'
        result = render(source)
        root = ET.fromstring("<div>" + result + "</div>")
        self.assertEqual(root.find("p/code").text, "<image>")
        self.assertEqual(root.find("p/em").text, "emphasis")
        self.assertEqual(root.find("pre/code").text.strip(), "<PERSON> <doc A>")

    def test_pdf_input_retains_literal_tokens(self):
        result = render('"<image A>" "<PERSON>" "<doc A>"', "latex")
        for token in ("image A", "PERSON", "doc A"):
            self.assertIn(token, result)
        self.assertEqual(result.count(r"\textless"), 3)
        self.assertEqual(result.count(r"\textgreater"), 3)

    def test_table_breaks_only_long_ascii_tokens(self):
        layout = ROOT / "book" / "pdf-layout.lua"
        for token in ("Abcdefghijklmnopqrstuvwxyz0123456789", "package.module.LongIdentifier123"):
            with self.subTest(token=token):
                source = f"| Value |\n| --- |\n| {token} |\n"
                result = render(source, "latex", layout)
                self.assertIn(r"\allowbreak{}", result)
                self.assertIn(token, result.replace(r"\allowbreak{}", ""))
                self.assertEqual(render(source, "html", layout), render(source, "html"))
        for token in ("short/path", "prefix_" + "e\u0301" * 12,
                      "prefix_" + "👩\u200d💻" * 4, "prefix_" + "x\ufe0f" * 12):
            with self.subTest(token=token):
                source = f"| Value |\n| --- |\n| {token} |\n"
                self.assertEqual(render(source, "latex", layout), render(source, "latex"))

    def test_requested_pdf_failure_fails_the_build(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.multiple(build_book, BUILD=Path(directory), DIST=Path(directory)), \
                 patch.object(build_book, "git_date", return_value="2026-09-07"), \
                 patch.object(build_book, "git_edition", return_value="2026.09"), \
                 patch.object(build_book, "pick_font", return_value="Noto Serif CJK SC"), \
                 patch.object(build_book.subprocess, "run", side_effect=[
                     None, subprocess.CalledProcessError(43, "pandoc"),
                 ]):
                with self.assertRaises(subprocess.CalledProcessError):
                    build_book.render(build_book.CONFIG["volumes"][0], Path("fixture.md"), 1, pdf=True)

    def test_chinese_pdf_requires_fonts_for_prose_and_code(self):
        with tempfile.TemporaryDirectory() as directory:
            for font in (None, "Noto Serif CJK SC"):
                with self.subTest(font=font), \
                     patch.multiple(build_book, BUILD=Path(directory), DIST=Path(directory), BOOK_LANG="zh"), \
                     patch.object(build_book, "git_date", return_value="2026-09-08"), \
                     patch.object(build_book, "git_edition", return_value="2026.09"), \
                     patch.object(build_book, "pick_font", return_value=font), \
                     patch.object(build_book.subprocess, "run") as run:
                    if font is None:
                        with self.assertRaisesRegex(RuntimeError, "CJK"):
                            build_book.render(build_book.CONFIG["volumes"][0], Path("fixture.md"), 1, pdf=True)
                        self.assertEqual(run.call_count, 1)
                    else:
                        build_book.render(build_book.CONFIG["volumes"][0], Path("fixture.md"), 1, pdf=True)
                        command = run.call_args.args[0]
                        self.assertIn("CJKmainfont=" + font, command)
                        self.assertIn("CJKmonofont=" + font, command)
                        self.assertIn("lang=zh-Hans", command)
                        metadata = (Path(directory) / "foundations-meta.yaml").read_text()
                        self.assertIn("lang: zh-Hans", metadata)

    @unittest.skipUnless(shutil.which("xelatex") and shutil.which("pdftotext"),
                         "PDF layout check requires xelatex and pdftotext")
    def test_pdf_long_code_and_urls_stay_inside_margins(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "wrapping.pdf"
            result = subprocess.run(
                ["pandoc", "--from", PDF_SOURCE_FORMAT, "--pdf-engine=xelatex",
                 "--lua-filter", str(ROOT / "book" / "pdf-layout.lua"),
                 "--include-in-header", str(ROOT / "book" / "theme.tex"),
                 "-V", "documentclass=book", "-V", "geometry=margin=1in",
                 "-o", str(pdf)],
                input=LONG_LINES, text=True, capture_output=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            bbox = subprocess.check_output(["pdftotext", "-bbox", str(pdf), "-"], text=True)
        root = ET.fromstring(bbox)
        ns = {"x": "http://www.w3.org/1999/xhtml"}
        for page in root.findall(".//x:page", ns):
            right = float(page.attrib["width"]) - 72
            for word in page.findall(".//x:word", ns):
                self.assertGreaterEqual(float(word.attrib["xMin"]), 71, word.text)
                self.assertLessEqual(float(word.attrib["xMax"]), right + 1, word.text)
        text = "".join(word.text or "" for word in root.findall(".//x:word", ns))
        for marker in ("embeddings.", "PLAIN_TEXT_END.", "neuralnetworksanddeeplearning.com",
                       "open_asr_leaderboard", "TTS-Arena", "{value}#100%_ok", "k×sr/N",
                       'paddleocr.PaddleOCR(lang="en").ocr(image_path)', "protocolVersion"):
            self.assertIn(marker, text)
        self.assertIn("OneHotEncoder(handle_unknown=", text)
        self.assertIn("Abcdefghijklmnopqrstuvwxyz0123456789" * 2, text)


class ChineseBookSnapshotTest(unittest.TestCase):
    def test_snapshot_date_is_strict_and_does_not_invent_a_date(self):
        self.assertEqual(build_book.snapshot_date_arg("2026-09-09"), "2026-09-09")
        for bad in ("2026-2-1", "2026-02-30", "20260909", "yesterday", "2026-W37-3"):
            with self.subTest(value=bad), self.assertRaises(argparse.ArgumentTypeError):
                build_book.snapshot_date_arg(bad)
        with patch.object(build_book, "SNAPSHOT_DATE", "2026-09-09"), \
             patch.object(build_book.subprocess, "run") as run:
            build_book.git_date.cache_clear()
            build_book.git_edition.cache_clear()
            self.assertEqual(build_book.git_date(), "2026-09-09")
            self.assertEqual(build_book.git_edition(), "2026.09")
            run.assert_not_called()
        build_book.git_date.cache_clear()
        build_book.git_edition.cache_clear()
        with patch.object(build_book, "git_date", return_value=""):
            self.assertEqual(build_book.git_edition(), "日期未标注")
        build_book.git_edition.cache_clear()

    def test_chinese_metadata_is_display_only_and_preserves_unknown_values(self):
        with patch.object(build_book, "BOOK_LANG", "zh"):
            self.assertEqual(build_book.localize_lesson_metadata("**Type:** Learn + Build"),
                             "**课程类型：** 概念学习 + 动手实践  ")
            self.assertEqual(build_book.localize_lesson_metadata("**Languages:** Python, Rust"),
                             "**使用语言：** Python, Rust  ")
            self.assertEqual(build_book.localize_lesson_metadata("**Type:** new-type"),
                             "**课程类型：** new-type  ")
            self.assertEqual(build_book.localize_lesson_metadata('payload = {"Type": "Build"}'),
                             'payload = {"Type": "Build"}')
        with patch.object(build_book, "BOOK_LANG", "en"):
            self.assertEqual(build_book.localize_lesson_metadata("**Type:** Build"), "**Type:** Build")

    def test_code_fences_keep_original_metadata_labels(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "lesson.md"
            source.write_text("# 示例\n\n**Type:** Build\n\n```text\n**Type:** Build\n```\n", encoding="utf-8")
            with patch.object(build_book, "_lesson_source", return_value=source):
                result = "\n".join(build_book.transform_lesson("phase", root / "lesson"))
            self.assertIn("**课程类型：** 动手实践", result)
            self.assertIn("```text\n**Type:** Build\n```", result)

    def test_tutor_url_does_not_consume_chinese_prose(self):
        with patch.object(build_book, "git_date", return_value="2026-09-09"):
            source = build_book.how_to_use(build_book.CONFIG["volumes"][0])
        result = subprocess.run(
            ["pandoc", "--from", PDF_SOURCE_FORMAT, "--to", "latex"],
            input=source, text=True, capture_output=True, check=True,
        ).stdout
        urls = re.findall(r"\\url\{([^}]+)\}", result)
        self.assertIn(build_book.SITE + "/llms.txt", urls)
        self.assertFalse(any("找到" in url or "，" in url for url in urls))
        self.assertIn("找到我指定的课程", result)
        self.assertIn("不是在线课程的完全离线镜像", result)

    def test_series_map_has_readable_pdf_column_weights(self):
        source = build_book.series_map(build_book.CONFIG["volumes"][0])
        result = render(source, "latex", ROOT / "book" / "pdf-layout.lua")
        for value in ("0.0800", "0.7200", "0.2000"):
            self.assertIn(value, result)
        self.assertIn("基础", result)

    @unittest.skipUnless(shutil.which("xelatex") and shutil.which("pdftotext"),
                         "中文 PDF 回归需要 xelatex 与 pdftotext")
    def test_chinese_tutor_prompt_is_present_in_the_pdf(self):
        font = build_book.pick_font(["Noto Serif CJK SC", "Noto Sans CJK SC"])
        if not font:
            self.skipTest("缺少中文字体")
        source = "# 中文保真检查\n\n> 请获取 <https://example.com/llms.txt>，找到我指定的课程，并担任我的导师。\n"
        source += '\n```python\n# 中文注释必须保留\nmessage = "测试"\n```\n'
        with tempfile.TemporaryDirectory() as tmp:
            pdf = Path(tmp) / "chinese.pdf"
            result = subprocess.run(
                ["pandoc", "--from", PDF_SOURCE_FORMAT, "--pdf-engine=xelatex",
                 "--include-in-header", str(ROOT / "book" / "theme.tex"),
                 "-V", "documentclass=book", "-V", "mainfont=DejaVu Serif",
                 "-V", "CJKmainfont=" + font, "-V", "CJKmonofont=" + font,
                 "-M", "lang=zh-Hans", "-o", str(pdf)],
                input=source, text=True, capture_output=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertNotIn("Missing character", result.stderr)
            text = subprocess.check_output(["pdftotext", str(pdf), "-"], text=True)
        text = re.sub(r"\s+", "", text)
        for required in ("找到我指定的课程", "并担任我的导师", "中文注释必须保留", "测试"):
            self.assertIn(required, text)


class ChineseBookArtifactTest(unittest.TestCase):
    def test_relative_repository_links_exclude_code_images_and_external_urls(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            lesson = root / "phases" / "unit"
            (lesson / "docs").mkdir(parents=True)
            (lesson / "code").mkdir()
            (lesson / "code" / "main.py").write_text("pass\n")
            line = '[实现](../code/main.py#run) [目录](../code/) `原样 [实现](../code/main.py)` ![图](../code/main.py) [站外](https://example.com/a) [未知](missing.md)'
            with patch.object(build_book, "ROOT", root):
                result = build_book.rewrite_document_links(line, lesson)
            self.assertIn('/blob/main/phases/unit/code/main.py#run', result)
            self.assertIn('/tree/main/phases/unit/code)', result)
            for unchanged in ('`原样 [实现](../code/main.py)`', '![图](../code/main.py)',
                              '[站外](https://example.com/a)', '[未知](missing.md)'):
                self.assertIn(unchanged, result)

    def test_bare_uri_chinese_suffix_is_prose_and_explicit_links_are_unchanged(self):
        source = '参考 https://example.com/a，继续阅读中文说明。\n\n[保留路径](https://example.com/中文，路径)\n'
        result = subprocess.run(
            ['pandoc', '--from', PDF_SOURCE_FORMAT, '--to', 'latex', '--lua-filter', str(ROOT/'book/pdf-layout.lua')],
            input=source, text=True, capture_output=True, check=True).stdout
        self.assertIn(r'\url{https://example.com/a}', result)
        self.assertIn('，继续阅读中文说明。', result)
        self.assertIn('https://example.com/中文，路径', result)

    def test_svg_missing_converter_is_explicit_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            md = Path(tmp)/'source.md'; md.write_text('![示例](asset.svg)\n')
            with patch.object(build_book.shutil, 'which', return_value=None):
                with self.assertRaisesRegex(RuntimeError, 'rsvg-convert.*Inkscape'):
                    build_book.prepare_pdf_markdown(md)

    @unittest.skipUnless(shutil.which('inkscape'), 'SVG 回归需要真实 Inkscape')
    def test_svg_fallback_exports_vector_pdf_without_modifying_epub_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); build = root/'book'; build.mkdir()
            (root/'asset.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="blue"/></svg>')
            md=build/'source.md'; original='![示例](asset.svg)\n\n```text\n![原样](asset.svg)\n```\n'; md.write_text(original)
            real_which=shutil.which
            with patch.multiple(build_book, ROOT=root, BUILD=build), \
                 patch.object(build_book.shutil, 'which', side_effect=lambda name: None if name=='rsvg-convert' else real_which(name)):
                converted=build_book.prepare_pdf_markdown(md)
            self.assertEqual(md.read_text(), original)
            self.assertIn('```text\n![原样](asset.svg)\n```', converted.read_text())
            outputs=list((build/'pdf-images').glob('*.pdf'))
            self.assertEqual(len(outputs),1)
            self.assertTrue(outputs[0].read_bytes().startswith(b'%PDF-'))

    def test_unicode_header_is_only_created_for_required_characters(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); md=root/'source.md'; md.write_text('中文和 English 123')
            with patch.object(build_book,'BUILD',root):
                self.assertIsNone(build_book.prepare_unicode_header(md))
                md.write_text('🔥🤖')
                header=build_book.prepare_unicode_header(md).read_text()
            self.assertIn('ActualText=D83DDD25',header)
            self.assertIn('ActualText=D83EDD16',header)
            self.assertNotIn('bookhindifont',header)

    @unittest.skipUnless(shutil.which('xelatex') and shutil.which('pdftotext'), '复杂字符 PDF 回归需要真实排版器')
    def test_multilingual_code_glyphs_and_long_chapter_fit_on_pdf_page(self):
        font=build_book.pick_font(['Noto Serif CJK SC','Noto Sans CJK SC'])
        if not font or not build_book.pick_font(['Noto Sans Devanagari']):
            self.skipTest('缺少相应中文或天城文字体')
        if not shutil.which('kpsewhich') or subprocess.run(['kpsewhich','twemojis.sty'],capture_output=True).returncode:
            self.skipTest('缺少 twemojis TeX 包')
        source='# 长标题回归：键值缓存、Flash Attention 与推理优化（KV Cache, Flash Attention & Inference Optimization）\n\n'
        source+='```python\nprint(classify("मुझे यह उत्पाद पसंद है!", ["positive", "negative", "neutral"]))\nprint("🔥", "🌍", "🤖💪")\nmessage = "中文文字"\n```\n'
        source+='\n内联：`🔥🌍🤖💪`；`मुझे`。\n'
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); md=root/'source.md'; md.write_text(source); pdf=root/'result.pdf'
            with patch.object(build_book,'BUILD',root):
                header=build_book.prepare_unicode_header(md)
            result=subprocess.run(['pandoc',str(md),'-o',str(pdf),'--pdf-engine=xelatex','--top-level-division=chapter',
                '-V','documentclass=book','-V','classoption=oneside,openany','-V','geometry=margin=1in',
                '-V','mainfont=DejaVu Serif','-V','monofont=DejaVu Sans Mono','-V','CJKmainfont='+font,'-V','CJKmonofont='+font,
                '--include-in-header',str(ROOT/'book/theme.tex'),'--include-in-header',str(header),
                '--lua-filter',str(ROOT/'book/pdf-layout.lua')],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertNotIn('Missing character:',result.stderr)
            text=subprocess.check_output(['pdftotext',str(pdf),'-'],text=True)
            for fragment in ('print','classify','positive','negative','neutral','मुझे','उत्पाद','🔥','🌍','🤖','💪'):
                self.assertIn(fragment,text)
            self.assertIn('中文文字',re.sub(r'\s+','',text))
            bbox=subprocess.check_output(['pdftotext','-bbox',str(pdf),'-'],text=True)
            tree=ET.fromstring(bbox[bbox.index('<html'):])
            ns={'x':'http://www.w3.org/1999/xhtml'}
            for page in tree.findall('.//x:page',ns):
                width,height=float(page.get('width')),float(page.get('height'))
                for word in page.findall('x:word',ns):
                    self.assertGreaterEqual(float(word.get('xMin')),-1)
                    self.assertLessEqual(float(word.get('xMax')),width+1)
                    self.assertLessEqual(float(word.get('yMax')),height+1)


if __name__ == "__main__":
    unittest.main()
